import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { generateDatedRef } from "@/lib/timezone";

function generateRef(): string {
  return generateDatedRef("PB");
}

type BatchMaterialInput = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  plannedQty: number;
  issuedQty?: number;
  uom?: string;
};

type RecipeMaterialRow = {
  itemId: string | null;
  itemCode: string | null;
  description: string;
  quantity: number;
  uom: string;
  wastagePct: number;
};

type RecipeForBatch = {
  companyId: string;
  status: string;
  productName: string;
  productCode: string | null;
  productItemId: string | null;
  batchSize: number;
  uom: string;
  lineFamily: string;
  materials: RecipeMaterialRow[];
};


export type BatchMaterialStockStatus = {
  materialId?: string;
  itemId: string | null;
  itemCode: string | null;
  description: string;
  uom: string;
  requiredQty: number;
  availableStock: number;
  shortfall: number;
  status: "OK" | "SHORTAGE" | "UNKNOWN";
};

export class InsufficientStockError extends Error {
  readonly code = "INSUFFICIENT_STOCK";
  readonly shortages: BatchMaterialStockStatus[];

  constructor(shortages: BatchMaterialStockStatus[]) {
    const list = shortages
      .map(
        (s) =>
          `${s.description}: need ${s.requiredQty} ${s.uom}, have ${s.availableStock} ${s.uom}`
      )
      .join("; ");
    super(`Insufficient stock to start batch. Short materials: ${list}`);
    this.name = "InsufficientStockError";
    this.shortages = shortages;
  }
}

type MaterialStockInput = {
  id?: string;
  itemId: string | null;
  itemCode: string | null;
  description: string;
  plannedQty: number;
  issuedQty?: number;
  uom: string;
};

/**
 * Resolve available stock for batch material lines (total across warehouses).
 * Required qty is planned minus already issued.
 */
export async function assessBatchMaterialStock(
  companyId: string,
  materials: MaterialStockInput[]
): Promise<BatchMaterialStockStatus[]> {
  const itemIds: string[] = [];
  const itemCodes: string[] = [];
  for (const mat of materials) {
    if (mat.itemId) itemIds.push(mat.itemId);
    else if (mat.itemCode) itemCodes.push(mat.itemCode);
  }

  const itemsByCode =
    itemCodes.length > 0
      ? await db.item.findMany({
          where: { companyId, code: { in: itemCodes } },
          select: { id: true, code: true },
        })
      : [];
  const codeToItemId = new Map(itemsByCode.map((i) => [i.code, i.id]));

  const allItemIds = Array.from(
    new Set([...itemIds, ...itemsByCode.map((i) => i.id)])
  );
  const stockBalances =
    allItemIds.length > 0
      ? await db.stockBalance.findMany({
          where: { itemId: { in: allItemIds } },
          select: { itemId: true, quantity: true },
        })
      : [];

  const stockByItem = new Map<string, number>();
  for (const sb of stockBalances) {
    stockByItem.set(sb.itemId, (stockByItem.get(sb.itemId) ?? 0) + (sb.quantity ?? 0));
  }

  return materials.map((mat) => {
    const requiredQty = Math.max(0, mat.plannedQty - (mat.issuedQty ?? 0));
    const resolvedItemId = mat.itemId ?? codeToItemId.get(mat.itemCode ?? "") ?? null;
    const availableStock = resolvedItemId ? (stockByItem.get(resolvedItemId) ?? 0) : 0;

    let status: BatchMaterialStockStatus["status"];
    if (!resolvedItemId) {
      status = requiredQty > 0 ? "UNKNOWN" : "OK";
    } else if (availableStock + 1e-9 < requiredQty) {
      status = "SHORTAGE";
    } else {
      status = "OK";
    }

    const shortfall =
      status === "OK" ? 0 : Math.max(0, requiredQty - availableStock);

    return {
      materialId: mat.id,
      itemId: mat.itemId,
      itemCode: mat.itemCode,
      description: mat.description,
      uom: mat.uom,
      requiredQty,
      availableStock,
      shortfall,
      status,
    };
  });
}

export function getBlockingShortages(
  assessments: BatchMaterialStockStatus[]
): BatchMaterialStockStatus[] {
  // Hard-block: SHORTAGE and UNKNOWN (unresolvable item with remaining need)
  return assessments.filter((a) => a.status === "SHORTAGE" || a.status === "UNKNOWN");
}

function assertPositiveFiniteNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
}

function parseOptionalDate(value: Date | string | null | undefined, field: string) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${field} is invalid`);
  }
  return date;
}

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

  const materialStock = await assessBatchMaterialStock(companyId, batch.materials);
  const shortages = getBlockingShortages(materialStock);
  return {
    ...batch,
    materialStock,
    stockGate: {
      canStart: batch.status !== "PLANNED" ? false : shortages.length === 0,
      shortages,
    },
  };
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

  let inheritedBatchType: string | null = null;

  if (data.recipeId) {
    const recipe = (await db.productionRecipe.findUnique({
      where: { id: data.recipeId },
      include: { materials: true },
    })) as RecipeForBatch | null;
    if (!recipe || recipe.companyId !== companyId) throw new Error("Production recipe not found");
    if (recipe.status !== "ACTIVE") throw new Error("Production recipe is inactive");
    productName = productName ?? recipe.productName;
    productCode = productCode ?? recipe.productCode;
    productItemId = productItemId ?? recipe.productItemId;
    plannedQty = plannedQty ?? recipe.batchSize;
    uom = data.uom ?? recipe.uom;
    // Map recipe lineFamily → batchType (BREWING | SPIRITS)
    inheritedBatchType = recipe.lineFamily === "SPIRITS" ? "SPIRITS" : "BREWING";
    if (!materials.length) {
      const multiplier = plannedQty && recipe.batchSize > 0 ? plannedQty / recipe.batchSize : 1;
      materials = recipe.materials.map((line: RecipeMaterialRow) => ({
        itemId: line.itemId,
        itemCode: line.itemCode,
        description: line.description,
        // requiredQty = qty × (1 + wastage/100) scaled to batch
        plannedQty: line.quantity * multiplier * (1 + line.wastagePct / 100),
        uom: line.uom,
      }));
    }
  }

  if (!productName) throw new Error("productName is required");
  if (plannedQty == null) throw new Error("plannedQty must be greater than 0");
  assertPositiveFiniteNumber(plannedQty, "plannedQty");

  for (const mat of materials) {
    if (!mat.description || !mat.description.trim()) {
      throw new Error("material description is required");
    }
    assertPositiveFiniteNumber(mat.plannedQty, `material quantity for ${mat.description || "line"}`);
    if (mat.issuedQty != null && (!Number.isFinite(mat.issuedQty) || mat.issuedQty < 0)) {
      throw new Error(`issued quantity for ${mat.description || "line"} cannot be negative`);
    }
  }

  const plannedStart = parseOptionalDate(data.plannedStart, "plannedStart");
  const plannedEnd = parseOptionalDate(data.plannedEnd, "plannedEnd");
  if (plannedStart && plannedEnd && plannedEnd < plannedStart) {
    throw new Error("plannedEnd cannot be before plannedStart");
  }

  const reference = generateRef();
  const batch = await db.productionBatch.create({
    data: {
      companyId,
      lineId: data.lineId ?? null,
      recipeId: data.recipeId ?? null,
      reference,
      batchType: data.batchType ?? inheritedBatchType ?? "BREWING",
      productItemId,
      productCode,
      productName,
      plannedQty,
      uom,
      plannedStart,
      plannedEnd,
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
  const existing = await db.productionBatch.findUnique({
    where: { id },
    include: { materials: true },
  });
  if (!existing || existing.companyId !== companyId) throw new Error("Production batch not found");
  if (existing.status !== "PLANNED") throw new Error("Only PLANNED batches can be started");

  // Server-side stock gate — do not trust the UI
  const materialStock = await assessBatchMaterialStock(companyId, existing.materials);
  const shortages = getBlockingShortages(materialStock);
  if (shortages.length > 0) {
    throw new InsufficientStockError(shortages);
  }

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
  if (actualQty != null) {
    assertPositiveFiniteNumber(actualQty, "actualQty");
  }

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

export async function deleteProductionBatch(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionBatch.findFirst({ where: { id, companyId } });
  if (!existing) throw new Error("Production batch not found");
  if (!["PLANNED", "CANCELLED"].includes(existing.status)) {
    throw new Error("Only PLANNED or CANCELLED batches can be deleted");
  }

  await db.$transaction([
    db.batchMaterial.deleteMany({ where: { batchId: id } }),
    db.productionBatch.delete({ where: { id } }),
  ]);

  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_BATCH_DELETE",
    module: "production",
    resource: "batch",
    recordId: id,
    oldValue: { reference: existing.reference, status: existing.status },
    description: `Deleted production batch: ${existing.reference}`,
    ipAddress,
    companyId,
  });
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

