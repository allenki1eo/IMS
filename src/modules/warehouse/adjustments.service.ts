import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(prefix: string): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  const suffix = String(Math.floor(Math.random() * 9000) + 1000);
  return `${prefix}-${date}-${suffix}`;
}

async function upsertStockBalance(params: {
  itemId: string;
  warehouseId: string;
  locationId: string | null;
  delta: number;
}) {
  const { itemId, warehouseId, locationId, delta } = params;

  const existing = await db.stockBalance.findFirst({
    where: { itemId, warehouseId, locationId: locationId ?? null },
  });

  if (existing) {
    await db.stockBalance.update({
      where: { id: existing.id },
      data: { quantity: existing.quantity + delta },
    });
    return existing.quantity + delta;
  } else {
    await db.stockBalance.create({
      data: { itemId, warehouseId, locationId: locationId ?? null, quantity: delta },
    });
    return delta;
  }
}

export async function listAdjustments(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    warehouseId?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, warehouseId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { reason: { contains: search } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
    ...(warehouseId ? { warehouseId } : {}),
  };

  const [adjustments, total] = await Promise.all([
    db.stockAdjustment.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.stockAdjustment.count({ where }),
  ]);

  return { adjustments, total };
}

export async function getAdjustmentById(id: string) {
  return db.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true, uom: { select: { symbol: true } } } },
          location: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function createAdjustment(params: {
  companyId: string;
  warehouseId: string;
  reason: string;
  notes?: string | null;
  lines: {
    itemId: string;
    locationId?: string | null;
    countedQty: number;
  }[];
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    companyId,
    warehouseId,
    reason,
    notes,
    lines,
    createdById,
    userName,
    ipAddress,
    userAgent,
  } = params;

  const reference = generateRef("ADJ");

  // Fetch system quantities from StockBalance for each line
  const linesWithSystem = await Promise.all(
    lines.map(async (line) => {
      const balance = await db.stockBalance.findFirst({
        where: {
          itemId: line.itemId,
          warehouseId,
          locationId: line.locationId ?? null,
        },
      });
      const systemQty = balance?.quantity ?? 0;
      const difference = line.countedQty - systemQty;
      return {
        itemId: line.itemId,
        locationId: line.locationId ?? null,
        systemQty,
        countedQty: line.countedQty,
        difference,
      };
    })
  );

  const adjustment = await db.stockAdjustment.create({
    data: {
      companyId,
      warehouseId,
      reference,
      reason,
      notes: notes ?? null,
      status: "DRAFT",
      createdById,
      lines: {
        create: linesWithSystem,
      },
    },
    include: { lines: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "ADJUSTMENT_CREATE",
    module: "warehouse",
    resource: "adjustment",
    recordId: adjustment.id,
    newValue: { reference, warehouseId, reason, lineCount: lines.length },
    description: `Created stock adjustment: ${reference}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return adjustment;
}

export async function submitAdjustment(
  id: string,
  submittedById: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  const adjustment = await db.stockAdjustment.findUnique({ where: { id } });

  if (!adjustment) throw new Error("Adjustment not found");
  if (adjustment.status !== "DRAFT") throw new Error("Only DRAFT adjustments can be submitted");

  const now = new Date();

  await db.stockAdjustment.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: now },
  });

  await createAuditLog({
    userId: submittedById,
    userName,
    action: "ADJUSTMENT_SUBMIT",
    module: "warehouse",
    resource: "adjustment",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "SUBMITTED" },
    description: `Submitted stock adjustment: ${adjustment.reference}`,
    ipAddress,
    userAgent,
    companyId: adjustment.companyId,
  });

  // Check if there is an approval workflow for warehouse:adjustment
  const workflow = await db.approvalWorkflow.findFirst({
    where: {
      companyId: adjustment.companyId,
      module: "warehouse",
      resource: "adjustment",
    },
  });

  if (workflow) {
    const { createApprovalRequest } = await import("@/modules/approvals/approvals.service");
    await createApprovalRequest({
      companyId: adjustment.companyId,
      workflowId: workflow.id,
      module: "warehouse",
      resource: "adjustment",
      recordId: id,
      recordReference: adjustment.reference,
      requestedById: submittedById,
      notes: adjustment.notes ?? undefined,
      userName,
      ipAddress,
    });

    // Update adjustment with approval request reference
    const approvalRequest = await db.approvalRequest.findFirst({
      where: { recordId: id, module: "warehouse", resource: "adjustment" },
      orderBy: { requestedAt: "desc" },
    });
    if (approvalRequest) {
      await db.stockAdjustment.update({
        where: { id },
        data: { approvalRequestId: approvalRequest.id },
      });
    }
  } else {
    // No workflow — auto-apply
    await applyAdjustment(id, submittedById, userName, ipAddress, userAgent);
  }

  return db.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function applyAdjustment(
  id: string,
  appliedById: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  const adjustment = await db.stockAdjustment.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!adjustment) throw new Error("Adjustment not found");
  if (!["SUBMITTED", "APPROVED"].includes(adjustment.status)) {
    throw new Error("Only SUBMITTED or APPROVED adjustments can be applied");
  }

  const now = new Date();

  await db.stockAdjustment.update({
    where: { id },
    data: { status: "APPLIED", appliedAt: now },
  });

  // Adjust stock balances and create ledger entries per line
  for (const line of adjustment.lines) {
    if (line.difference === 0) continue;

    const balanceAfter = await upsertStockBalance({
      itemId: line.itemId,
      warehouseId: adjustment.warehouseId,
      locationId: line.locationId,
      delta: line.difference,
    });

    const transactionType = line.difference > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT";

    await db.stockLedger.create({
      data: {
        companyId: adjustment.companyId,
        itemId: line.itemId,
        warehouseId: adjustment.warehouseId,
        locationId: line.locationId,
        transactionType,
        quantity: Math.abs(line.difference),
        balanceAfter,
        referenceType: "ADJUSTMENT",
        referenceId: adjustment.id,
        notes: `Stock adjustment applied: ${adjustment.reference} — ${adjustment.reason}`,
        createdById: appliedById,
      },
    });
  }

  await createAuditLog({
    userId: appliedById,
    userName,
    action: "ADJUSTMENT_APPLY",
    module: "warehouse",
    resource: "adjustment",
    recordId: id,
    oldValue: { status: adjustment.status },
    newValue: { status: "APPLIED" },
    description: `Applied stock adjustment: ${adjustment.reference}`,
    ipAddress,
    userAgent,
    companyId: adjustment.companyId,
  });

  return db.stockAdjustment.findUnique({
    where: { id },
    include: {
      warehouse: { select: { id: true, name: true } },
      lines: {
        include: {
          item: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}
