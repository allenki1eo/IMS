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

