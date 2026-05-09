import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `PB-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

type BatchMaterialInput = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  plannedQty: number;
  issuedQty?: number;
  uom?: string;
};

export async function listProductionBatches(
  companyId: string,
  params: { search?: string; status?: string; lineId?: string; page: number; pageSize: number }
) {
  const { search, status, lineId, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(lineId ? { lineId } : {}),
    ...(search
      ? { OR: [{ reference: { contains: search } }, { productName: { contains: search } }, { productCode: { contains: search } }] }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.productionBatch.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        line: { select: { id: true, code: true, name: true } },
        recipe: { select: { id: true, code: true, name: true } },
        _count: { select: { materials: true } },
      },
    }),
    db.productionBatch.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getProductionBatch(companyId: string, id: string) {
  const batch = await db.productionBatch.findUnique({
    where: { id },
    include: {
      line: true,
      recipe: true,
      materials: true,
    },
  });
  if (!batch || batch.companyId !== companyId) return null;
  return batch;
}

export async function createProductionBatch(
  companyId: string,
  data: {
    lineId?: string | null;
    recipeId?: string | null;
    batchType?: string;
    productItemId?: string | null;
    productCode?: string | null;
    productName?: string | null;
    plannedQty?: number | null;
    uom?: string;
    plannedStart?: Date | string | null;
    plannedEnd?: Date | string | null;
    notes?: string | null;
    materials?: BatchMaterialInput[];
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  let productName = data.productName ?? null;
  let productCode = data.productCode ?? null;
  let productItemId = data.productItemId ?? null;
  let plannedQty = data.plannedQty ?? null;
  let uom = data.uom ?? "L";
  let materials = data.materials ?? [];

  if (data.lineId) {
    const line = await db.productionLine.findUnique({ where: { id: data.lineId } });
    if (!line || line.companyId !== companyId) throw new Error("Production line not found");
    if (line.status !== "ACTIVE") throw new Error("Production line is inactive");
  }

  if (data.recipeId) {
    const recipe = await db.productionRecipe.findUnique({
      where: { id: data.recipeId },
      include: { materials: true },
    });
    if (!recipe || recipe.companyId !== companyId) throw new Error("Production recipe not found");
    if (recipe.status !== "ACTIVE") throw new Error("Production recipe is inactive");
    productName = productName ?? recipe.productName;
    productCode = productCode ?? recipe.productCode;
    productItemId = productItemId ?? recipe.productItemId;
    plannedQty = plannedQty ?? recipe.batchSize;
    uom = data.uom ?? recipe.uom;
    if (!materials.length) {
      const multiplier = plannedQty && recipe.batchSize > 0 ? plannedQty / recipe.batchSize : 1;
      materials = recipe.materials.map((line) => ({
        itemId: line.itemId,
        itemCode: line.itemCode,
        description: line.description,
        plannedQty: line.quantity * multiplier * (1 + line.wastagePct / 100),
        uom: line.uom,
      }));
    }
  }

  if (!productName) throw new Error("productName is required");
  if (!plannedQty || plannedQty <= 0) throw new Error("plannedQty must be greater than 0");

  const reference = generateRef();
  const batch = await db.productionBatch.create({
    data: {
      companyId,
      lineId: data.lineId ?? null,
      recipeId: data.recipeId ?? null,
      reference,
      batchType: data.batchType ?? "BREWING",
      productItemId,
      productCode,
      productName,
      plannedQty,
      uom,
      plannedStart: data.plannedStart ? new Date(data.plannedStart) : null,
      plannedEnd: data.plannedEnd ? new Date(data.plannedEnd) : null,
      notes: data.notes ?? null,
      createdById,
      materials: {
        create: materials.map((line) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          plannedQty: line.plannedQty,
          issuedQty: line.issuedQty ?? 0,
          uom: line.uom ?? "KG",
        })),
      },
    },
    include: { materials: true, line: true, recipe: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PRODUCTION_BATCH_CREATE",
    module: "production",
    resource: "batch",
    recordId: batch.id,
    newValue: { reference, productName, plannedQty },
    description: `Created production batch: ${reference}`,
    ipAddress,
    companyId,
  });

  return batch;
}

export async function startProductionBatch(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionBatch.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Production batch not found");
  if (existing.status !== "PLANNED") throw new Error("Only PLANNED batches can be started");

  const updated = await db.productionBatch.update({
    where: { id },
    data: { status: "IN_PROGRESS", startedAt: new Date() },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_BATCH_START",
    module: "production",
    resource: "batch",
    recordId: id,
    oldValue: { status: "PLANNED" },
    newValue: { status: "IN_PROGRESS" },
    description: `Started production batch: ${existing.reference}`,
    ipAddress,
    companyId,
  });
  return updated;
}

export async function completeProductionBatch(
  companyId: string,
  id: string,
  actualQty: number | null,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionBatch.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Production batch not found");
  if (existing.status !== "IN_PROGRESS") throw new Error("Only IN_PROGRESS batches can be completed");

  const updated = await db.productionBatch.update({
    where: { id },
    data: {
      status: "COMPLETED",
      actualQty: actualQty ?? existing.plannedQty,
      completedAt: new Date(),
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_BATCH_COMPLETE",
    module: "production",
    resource: "batch",
    recordId: id,
    oldValue: { status: "IN_PROGRESS" },
    newValue: { status: "COMPLETED", actualQty: updated.actualQty },
    description: `Completed production batch: ${existing.reference}`,
    ipAddress,
    companyId,
  });
  return updated;
}

export async function cancelProductionBatch(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionBatch.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Production batch not found");
  if (!["PLANNED", "IN_PROGRESS"].includes(existing.status)) throw new Error("Only open batches can be cancelled");

  const updated = await db.productionBatch.update({ where: { id }, data: { status: "CANCELLED" } });
  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_BATCH_CANCEL",
    module: "production",
    resource: "batch",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status: "CANCELLED" },
    description: `Cancelled production batch: ${existing.reference}`,
    ipAddress,
    companyId,
  });
  return updated;
}

