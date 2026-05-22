import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `TRA-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listStampBatches(
  companyId: string,
  params: { search?: string; status?: string; page: number; pageSize: number }
) {
  const { search, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const filters: Record<string, unknown>[] = [];
  if (status) filters.push({ status });
  if (status === "ACTIVE") {
    filters.push({ OR: [{ expiresAt: null }, { expiresAt: { gte: new Date() } }] });
  }
  if (search) {
    filters.push({ OR: [{ batchNumber: { contains: search } }, { stampType: { contains: search } }] });
  }
  const where = {
    companyId,
    ...(filters.length ? { AND: filters } : {}),
  };
  const [data, total] = await Promise.all([
    db.traStampBatch.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    db.traStampBatch.count({ where }),
  ]);
  return { data, meta: { total, page, pageSize } };
}

type StampBatch = {
  id: string;
  companyId: string;
  batchNumber: string;
  stampType: string;
  quantity: number;
  used: number;
  expiresAt: Date | null;
  status: string;
};

type StampBatchInput = {
  batchNumber?: unknown;
  stampType?: unknown;
  quantity?: unknown;
  serialFrom?: unknown;
  serialTo?: unknown;
  receivedAt?: unknown;
  expiresAt?: unknown;
  notes?: unknown;
};

type StampActivationInput = {
  batchId?: unknown;
  productName?: unknown;
  quantity?: unknown;
  activatedAt?: unknown;
  notes?: unknown;
};

function asTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function optionalString(value: unknown): string | null {
  const str = asTrimmedString(value);
  return str || null;
}

function positiveInteger(value: unknown, label: string): number {
  const num = Number(value);
  if (!Number.isInteger(num) || num <= 0) throw new Error(`${label} must be a positive whole number`);
  return num;
}

function optionalDate(value: unknown, label: string): Date | null {
  if (!value) return null;
  const date = new Date(value as string);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

function assertBatchCanActivate(batch: StampBatch, qty: number, now = new Date()) {
  if (batch.status !== "ACTIVE") throw new Error("Only active stamp batches can be activated");
  if (batch.expiresAt && batch.expiresAt < now) throw new Error("Stamp batch has expired");
  const balance = batch.quantity - batch.used;
  if (qty > balance) throw new Error(`Insufficient stamps. Available: ${balance}`);
}

export async function getStampBatch(companyId: string, id: string) {
  const batch = await db.traStampBatch.findUnique({
    where: { id },
    include: { activations: { orderBy: { activatedAt: "desc" } } },
  });
  if (!batch || batch.companyId !== companyId) return null;
  return batch;
}

export async function createStampBatch(
  companyId: string,
  data: StampBatchInput,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const batchNumber = asTrimmedString(data.batchNumber);
  if (!batchNumber) throw new Error("Batch number is required");

  const quantity = positiveInteger(data.quantity, "Quantity");
  const receivedAt = optionalDate(data.receivedAt, "Received date") ?? new Date();
  const expiresAt = optionalDate(data.expiresAt, "Expiry date");
  if (expiresAt && expiresAt < receivedAt) throw new Error("Expiry date cannot be before received date");

  const batch = await db.traStampBatch.create({
    data: {
      companyId,
      batchNumber,
      stampType: asTrimmedString(data.stampType) || "BEER",
      quantity,
      serialFrom: optionalString(data.serialFrom),
      serialTo: optionalString(data.serialTo),
      receivedAt,
      expiresAt,
      notes: optionalString(data.notes),
      createdById: userId,
    },
  });
  await createAuditLog({
    userId,
    userName,
    action: "TRA_STAMP_BATCH_CREATE",
    module: "tra-stamps",
    resource: "stamp-batch",
    recordId: batch.id,
    newValue: { batchNumber: batch.batchNumber },
    description: "Created TRA stamp batch",
    ipAddress,
    companyId,
  });
  return batch;
}

export async function listStampActivations(
  companyId: string,
  params: { search?: string; batchId?: string; page: number; pageSize: number }
) {
  const { search, batchId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(batchId ? { batchId } : {}),
    ...(search
      ? { OR: [{ reference: { contains: search } }, { productName: { contains: search } }] }
      : {}),
  };
  const [data, total] = await Promise.all([
    db.traStampActivation.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { activatedAt: "desc" },
      include: { batch: { select: { batchNumber: true, stampType: true } } },
    }),
    db.traStampActivation.count({ where }),
  ]);
  return { data, meta: { total, page, pageSize } };
}

export async function createStampActivation(
  companyId: string,
  data: StampActivationInput,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const batchId = asTrimmedString(data.batchId);
  const productName = asTrimmedString(data.productName);
  const qty = positiveInteger(data.quantity, "Quantity");
  const activatedAt = optionalDate(data.activatedAt, "Activation date") ?? new Date();

  if (!batchId) throw new Error("Stamp batch is required");
  if (!productName) throw new Error("Product name is required");

  const batch = await db.traStampBatch.findUnique({ where: { id: batchId } }) as StampBatch | null;
  if (!batch || batch.companyId !== companyId) throw new Error("Stamp batch not found");
  assertBatchCanActivate(batch, qty, activatedAt);

  const activation = await db.$transaction(async (tx: Prisma.TransactionClient) => {
    const updated = await tx.traStampBatch.updateMany({
      where: {
        id: batchId,
        companyId,
        status: "ACTIVE",
        used: { lte: batch.quantity - qty },
      },
      data: {
        used: { increment: qty },
      },
    });
    if (updated.count === 0) throw new Error("Insufficient stamps. Please refresh and try again");

    const updatedBatch = await tx.traStampBatch.findUnique({ where: { id: batchId } }) as StampBatch | null;
    if (!updatedBatch) throw new Error("Stamp batch not found");
    if (updatedBatch.used >= updatedBatch.quantity) {
      await tx.traStampBatch.update({
        where: { id: batchId },
        data: { status: "DEPLETED" },
      });
    }

    return tx.traStampActivation.create({
      data: {
        companyId,
        batchId,
        reference: generateRef(),
        productName,
        quantity: qty,
        activatedAt,
        notes: optionalString(data.notes),
        createdById: userId,
      },
    });
  });

  await createAuditLog({
    userId,
    userName,
    action: "TRA_STAMP_ACTIVATE",
    module: "tra-stamps",
    resource: "stamp-activation",
    recordId: activation.id,
    newValue: { productName, quantity: qty },
    description: "Activated TRA stamps",
    ipAddress,
    companyId,
  });
  return activation;
}

export async function getStampSummary(companyId: string) {
  const batches = await db.traStampBatch.findMany({ where: { companyId } }) as StampBatch[];
  const now = new Date();
  const totalReceived = batches.reduce((s, b) => s + b.quantity, 0);
  const totalUsed = batches.reduce((s, b) => s + b.used, 0);
  const activeBatches = batches.filter((b) => b.status === "ACTIVE" && (!b.expiresAt || b.expiresAt >= now));
  const totalBalance = activeBatches.reduce((s, b) => s + b.quantity - b.used, 0);
  const byType: Record<string, { received: number; used: number; balance: number }> = {};
  for (const b of batches) {
    if (!byType[b.stampType]) byType[b.stampType] = { received: 0, used: 0, balance: 0 };
    byType[b.stampType].received += b.quantity;
    byType[b.stampType].used += b.used;
    if (b.status === "ACTIVE" && (!b.expiresAt || b.expiresAt >= now)) {
      byType[b.stampType].balance += b.quantity - b.used;
    }
  }
  return { totalReceived, totalUsed, totalBalance, activeBatches: activeBatches.length, byType };
}
