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
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(search
      ? { OR: [{ batchNumber: { contains: search } }, { stampType: { contains: search } }] }
      : {}),
  };
  const [data, total] = await Promise.all([
    db.traStampBatch.findMany({ where, skip, take: pageSize, orderBy: { createdAt: "desc" } }),
    db.traStampBatch.count({ where }),
  ]);
  return { data, meta: { total, page, pageSize } };
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
  data: Record<string, unknown>,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const batch = await db.traStampBatch.create({
    data: {
      companyId,
      batchNumber: data.batchNumber as string,
      stampType: (data.stampType as string) ?? "BEER",
      quantity: Number(data.quantity),
      serialFrom: (data.serialFrom as string | undefined) ?? null,
      serialTo: (data.serialTo as string | undefined) ?? null,
      receivedAt: data.receivedAt ? new Date(data.receivedAt as string) : new Date(),
      expiresAt: data.expiresAt ? new Date(data.expiresAt as string) : null,
      notes: (data.notes as string | undefined) ?? null,
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
  data: Record<string, unknown>,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const batch = await db.traStampBatch.findUnique({ where: { id: data.batchId as string } });
  if (!batch || batch.companyId !== companyId) throw new Error("Stamp batch not found");

  const balance = batch.quantity - batch.used;
  const qty = Number(data.quantity);
  if (qty > balance) throw new Error(`Insufficient stamps. Available: ${balance}`);

  const newUsed = batch.used + qty;

  const [activation] = await db.$transaction([
    db.traStampActivation.create({
      data: {
        companyId,
        batchId: data.batchId as string,
        reference: generateRef(),
        productName: data.productName as string,
        quantity: qty,
        activatedAt: data.activatedAt ? new Date(data.activatedAt as string) : new Date(),
        notes: (data.notes as string | undefined) ?? null,
        createdById: userId,
      },
    }),
    db.traStampBatch.update({
      where: { id: data.batchId as string },
      data: {
        used: { increment: qty },
        status: newUsed >= batch.quantity ? "DEPLETED" : "ACTIVE",
      },
    }),
  ]);

  await createAuditLog({
    userId,
    userName,
    action: "TRA_STAMP_ACTIVATE",
    module: "tra-stamps",
    resource: "stamp-activation",
    recordId: activation.id,
    newValue: { productName: data.productName, quantity: qty },
    description: "Activated TRA stamps",
    ipAddress,
  });
  return activation;
}

export async function getStampSummary(companyId: string) {
  const batches = await db.traStampBatch.findMany({ where: { companyId, status: "ACTIVE" } });
  const totalReceived = batches.reduce((s, b) => s + b.quantity, 0);
  const totalUsed = batches.reduce((s, b) => s + b.used, 0);
  const totalBalance = totalReceived - totalUsed;
  const byType: Record<string, { received: number; used: number; balance: number }> = {};
  for (const b of batches) {
    if (!byType[b.stampType]) byType[b.stampType] = { received: 0, used: 0, balance: 0 };
    byType[b.stampType].received += b.quantity;
    byType[b.stampType].used += b.used;
    byType[b.stampType].balance += b.quantity - b.used;
  }
  return { totalReceived, totalUsed, totalBalance, activeBatches: batches.length, byType };
}
