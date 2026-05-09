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

export async function listGRNs(
  companyId: string,
  params: {
    search?: string;
    warehouseId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, warehouseId, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { supplierName: { contains: search } },
            { supplierRef: { contains: search } },
          ],
        }
      : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(status ? { status } : {}),
  };

  const [grns, total] = await Promise.all([
    db.goodsReceivedNote.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        warehouse: { select: { id: true, name: true, code: true } },
        _count: { select: { lines: true } },
      },
    }),
    db.goodsReceivedNote.count({ where }),
  ]);

  return { grns, total };
}

export async function getGRNById(id: string) {
  return db.goodsReceivedNote.findUnique({
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

export async function createGRN(params: {
  companyId: string;
  warehouseId: string;
  supplierName?: string | null;
  supplierRef?: string | null;
  notes?: string | null;
  lines: {
    itemId: string;
    locationId?: string | null;
    quantity: number;
    unitCost?: number | null;
  }[];
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    companyId,
    warehouseId,
    supplierName,
    supplierRef,
    notes,
    lines,
    createdById,
    userName,
    ipAddress,
    userAgent,
  } = params;

  const reference = generateRef("GRN");

  const grn = await db.goodsReceivedNote.create({
    data: {
      companyId,
      warehouseId,
      reference,
      supplierName: supplierName ?? null,
      supplierRef: supplierRef ?? null,
      notes: notes ?? null,
      status: "DRAFT",
      receivedById: createdById,
      createdById,
      lines: {
        create: lines.map((line) => ({
          itemId: line.itemId,
          locationId: line.locationId ?? null,
          quantity: line.quantity,
          unitCost: line.unitCost ?? null,
          totalCost:
            line.unitCost != null ? line.quantity * line.unitCost : null,
        })),
      },
    },
    include: {
      lines: true,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "GRN_CREATE",
    module: "warehouse",
    resource: "grn",
    recordId: grn.id,
    newValue: { reference, warehouseId, lineCount: lines.length },
    description: `Created GRN: ${reference}`,
    ipAddress,
    userAgent,
    companyId,
  });

  return grn;
}

export async function confirmGRN(
  id: string,
  confirmedById: string,
  userName: string,
  ipAddress?: string,
  userAgent?: string
) {
  const grn = await db.goodsReceivedNote.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!grn) throw new Error("GRN not found");
  if (grn.status !== "DRAFT") throw new Error("Only DRAFT GRNs can be confirmed");

  const now = new Date();

  // Update GRN status
  await db.goodsReceivedNote.update({
    where: { id },
    data: {
      status: "CONFIRMED",
      receivedAt: now,
      receivedById: confirmedById,
    },
  });

  // Process each line: upsert stock balance and insert ledger entry
  for (const line of grn.lines) {
    const balanceAfter = await upsertStockBalance({
      itemId: line.itemId,
      warehouseId: grn.warehouseId,
      locationId: line.locationId,
      delta: line.quantity,
    });

    await db.stockLedger.create({
      data: {
        companyId: grn.companyId,
        itemId: line.itemId,
        warehouseId: grn.warehouseId,
        locationId: line.locationId,
        transactionType: "RECEIPT",
        quantity: line.quantity,
        balanceAfter,
        unitCost: line.unitCost,
        totalCost: line.totalCost,
        referenceType: "GRN",
        referenceId: grn.id,
        notes: `GRN confirmed: ${grn.reference}`,
        createdById: confirmedById,
      },
    });
  }

  await createAuditLog({
    userId: confirmedById,
    userName,
    action: "GRN_CONFIRM",
    module: "warehouse",
    resource: "grn",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "CONFIRMED" },
    description: `Confirmed GRN: ${grn.reference}`,
    ipAddress,
    userAgent,
    companyId: grn.companyId,
  });

  return db.goodsReceivedNote.findUnique({
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
