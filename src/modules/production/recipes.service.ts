import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

type RecipeMaterialInput = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number;
  uom?: string;
  wastagePct?: number;
};

type ItemCodeRow = {
  id: string;
  code: string;
};

function assertPositiveFiniteNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${field} must be greater than 0`);
  }
}

export async function listProductionRecipes(
  companyId: string,
  params: { search?: string; status?: string; page: number; pageSize: number }
) {
  const { search, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;
  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(search
      ? { OR: [{ code: { contains: search } }, { name: { contains: search } }, { productName: { contains: search } }] }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.productionRecipe.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { updatedAt: "desc" },
      include: { _count: { select: { materials: true, batches: true } } },
    }),
    db.productionRecipe.count({ where }),
  ]);

  return { data, meta: { total, page, pageSize } };
}

export async function getProductionRecipe(companyId: string, id: string) {
  const recipe = await db.productionRecipe.findUnique({
    where: { id },
    include: {
      materials: true,
      batches: {
        orderBy: { createdAt: "desc" },
        take: 10,
        include: { line: { select: { id: true, code: true, name: true } } },
      },
    },
  });
  if (!recipe || recipe.companyId !== companyId) return null;
  return recipe;
}

export async function createProductionRecipe(
  companyId: string,
  data: {
    code: string;
    name: string;
    productItemId?: string | null;
    productCode?: string | null;
    productName: string;
    batchSize: number;
    uom?: string;
    version?: string;
    notes?: string | null;
    materials: RecipeMaterialInput[];
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  if (!data.materials.length) throw new Error("At least one material is required");
  assertPositiveFiniteNumber(data.batchSize, "batchSize");

  for (const mat of data.materials) {
    if (!mat.description || !mat.description.trim()) {
      throw new Error("material description is required");
    }
    assertPositiveFiniteNumber(mat.quantity, `material quantity for ${mat.description || "line"}`);
    if (mat.wastagePct != null && (!Number.isFinite(mat.wastagePct) || mat.wastagePct < 0)) {
      throw new Error(`wastage percentage for ${mat.description || "line"} cannot be negative`);
    }
  }

  const recipe = await db.productionRecipe.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      productItemId: data.productItemId ?? null,
      productCode: data.productCode ?? null,
      productName: data.productName,
      batchSize: data.batchSize,
      uom: data.uom ?? "L",
      version: data.version ?? "1",
      notes: data.notes ?? null,
      createdById,
      materials: {
        create: data.materials.map((line) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          quantity: line.quantity,
          uom: line.uom ?? "KG",
          wastagePct: line.wastagePct ?? 0,
        })),
      },
    },
    include: { materials: true },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "PRODUCTION_RECIPE_CREATE",
    module: "production",
    resource: "recipe",
    recordId: recipe.id,
    newValue: { code: recipe.code, productName: recipe.productName, batchSize: recipe.batchSize },
    description: `Created production recipe: ${recipe.code}`,
    ipAddress,
    companyId,
  });

  return recipe;
}

export async function calculateRecipeCapacity(
  companyId: string,
  recipeId: string
) {
  const recipe = await db.productionRecipe.findUnique({
    where: { id: recipeId },
    include: { materials: true },
  });
  if (!recipe || recipe.companyId !== companyId) return null;

  // Gather item identifiers
  const itemIds: string[] = [];
  const itemCodes: string[] = [];
  for (const mat of recipe.materials) {
    if (mat.itemId) itemIds.push(mat.itemId);
    else if (mat.itemCode) itemCodes.push(mat.itemCode);
  }

  // Resolve codes to IDs
  const itemsByCode: ItemCodeRow[] =
    itemCodes.length > 0
      ? await db.item.findMany({
          where: { companyId, code: { in: itemCodes } },
          select: { id: true, code: true },
        })
      : [];
  const codeToItemId = new Map(itemsByCode.map((i) => [i.code, i.id]));

  // Fetch stock balances for all resolved items
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

  interface MaterialCapacity {
    description: string;
    requiredPerBatch: number;
    availableStock: number;
    maxUnits: number;
    status: "OK" | "SHORTAGE" | "UNKNOWN";
  }

  const materials: MaterialCapacity[] = [];
  let maxUnits = Infinity;
  let limitingMaterial: MaterialCapacity | undefined;

  for (const mat of recipe.materials) {
    const resolvedItemId = mat.itemId ?? codeToItemId.get(mat.itemCode ?? "") ?? null;
    const availableStock = resolvedItemId ? (stockByItem.get(resolvedItemId) ?? 0) : 0;
    const requiredPerBatch = mat.quantity;

    let matMaxUnits: number;
    let status: MaterialCapacity["status"];

    if (!resolvedItemId || requiredPerBatch <= 0) {
      matMaxUnits = 0;
      status = "UNKNOWN";
    } else {
      matMaxUnits = Math.floor(availableStock / requiredPerBatch);
      status = matMaxUnits > 0 ? "OK" : "SHORTAGE";
    }

    const matCap: MaterialCapacity = {
      description: mat.description,
      requiredPerBatch,
      availableStock,
      maxUnits: matMaxUnits,
      status,
    };

    materials.push(matCap);

    if (matMaxUnits < maxUnits) {
      maxUnits = matMaxUnits;
      limitingMaterial = matCap;
    }
  }

  return {
    maxUnits: Number.isFinite(maxUnits) ? maxUnits : 0,
    batchSize: recipe.batchSize,
    limitingMaterial,
    materials,
  };
}

export async function updateProductionRecipeStatus(
  companyId: string,
  id: string,
  status: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionRecipe.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Production recipe not found");
  if (!["ACTIVE", "INACTIVE", "ARCHIVED"].includes(status)) throw new Error("Invalid status");

  const updated = await db.productionRecipe.update({ where: { id }, data: { status } });
  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_RECIPE_STATUS",
    module: "production",
    resource: "recipe",
    recordId: id,
    oldValue: { status: existing.status },
    newValue: { status },
    description: `Updated production recipe status: ${existing.code}`,
    ipAddress,
    companyId,
  });
  return updated;
}

export async function deleteProductionRecipe(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.productionRecipe.findFirst({
    where: { id, companyId },
    include: { _count: { select: { batches: true } } },
  });
  if (!existing) throw new Error("Production recipe not found");
  if (existing._count.batches > 0) {
    throw new Error("Production recipe has batches and cannot be deleted");
  }

  await db.$transaction([
    db.recipeMaterial.deleteMany({ where: { recipeId: id } }),
    db.productionRecipe.delete({ where: { id } }),
  ]);

  await createAuditLog({
    userId,
    userName,
    action: "PRODUCTION_RECIPE_DELETE",
    module: "production",
    resource: "recipe",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name },
    description: `Deleted production recipe: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId,
  });
}

