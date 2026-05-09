import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `PR-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

type RequestLineInput = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number;
  uom?: string;
  estimatedUnitCost?: number | null;
};

function lineTotal(line: RequestLineInput) {
  return line.estimatedUnitCost != null ? line.quantity * line.estimatedUnitCost : null;
}

export async function listPurchaseRequests(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    priority?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, priority, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(priority ? { priority } : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { purpose: { contains: search } },
            { notes: { contains: search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.purchaseRequest.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { lines: true, purchaseOrders: true } } },
    }),
    db.purchaseRequest.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getPurchaseRequest(companyId: string, id: string) {
  const request = await db.purchaseRequest.findUnique({
    where: { id },
    include: {
      lines: true,
      purchaseOrders: {
        orderBy: { createdAt: "desc" },
        include: { supplier: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!request) return null;
  if (request.companyId !== companyId) return null;
  return request;
}

export async function createPurchaseRequest(
  companyId: string,
  data: {
    departmentId?: string | null;
    purpose: string;
    priority?: string;
    neededBy?: Date | string | null;
    notes?: string | null;
    lines: RequestLineInput[];
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  if (!data.lines.length) throw new Error("At least one line is required");

  const reference = generateRef();
  const estimatedTotal = data.lines.reduce((sum, line) => sum + (lineTotal(line) ?? 0), 0);

  const request = await db.purchaseRequest.create({
    data: {
      companyId,
      departmentId: data.departmentId ?? null,
      reference,
      purpose: data.purpose,
      priority: data.priority ?? "NORMAL",
      neededBy: data.neededBy ? new Date(data.neededBy) : null,
      requestedById: createdById,
      notes: data.notes ?? null,
      estimatedTotal,
      createdById,
      lines: {
        create: data.lines.map((line) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom ?? "PCS",
          estimatedUnitCost: line.estimatedUnitCost ?? null,
          estimatedTotal: lineTotal(line),
        })),
      },
    },
    include: { lines: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PURCHASE_REQUEST_CREATE",
    module: "procurement",
    resource: "request",
    recordId: request.id,
    newValue: { reference, purpose: data.purpose, estimatedTotal },
    description: `Created purchase request: ${reference}`,
    ipAddress,
    companyId,
  });

  return request;
}

export async function submitPurchaseRequest(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase request not found");
  if (existing.companyId !== companyId) throw new Error("Purchase request not found");
  if (existing.status !== "DRAFT") throw new Error("Only DRAFT requests can be submitted");

  const updated = await db.purchaseRequest.update({
    where: { id },
    data: { status: "SUBMITTED", submittedAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PURCHASE_REQUEST_SUBMIT",
    module: "procurement",
    resource: "request",
    recordId: id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "SUBMITTED" },
    description: `Submitted purchase request: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function approvePurchaseRequest(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase request not found");
  if (existing.companyId !== companyId) throw new Error("Purchase request not found");
  if (existing.status !== "SUBMITTED") throw new Error("Only SUBMITTED requests can be approved");

  const updated = await db.purchaseRequest.update({
    where: { id },
    data: { status: "APPROVED", approvedById: userId, approvedAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PURCHASE_REQUEST_APPROVE",
    module: "procurement",
    resource: "request",
    recordId: id,
    oldValue: { status: "SUBMITTED" },
    newValue: { status: "APPROVED" },
    description: `Approved purchase request: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function rejectPurchaseRequest(
  companyId: string,
  id: string,
  reason: string | null,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.purchaseRequest.findUnique({ where: { id } });
  if (!existing) throw new Error("Purchase request not found");
  if (existing.companyId !== companyId) throw new Error("Purchase request not found");
  if (existing.status !== "SUBMITTED") throw new Error("Only SUBMITTED requests can be rejected");

  const updated = await db.purchaseRequest.update({
    where: { id },
    data: { status: "REJECTED", rejectedReason: reason },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PURCHASE_REQUEST_REJECT",
    module: "procurement",
    resource: "request",
    recordId: id,
    oldValue: { status: "SUBMITTED" },
    newValue: { status: "REJECTED", rejectedReason: reason },
    description: `Rejected purchase request: ${existing.reference}`,
    ipAddress,
    companyId,
  });

  return updated;
}

