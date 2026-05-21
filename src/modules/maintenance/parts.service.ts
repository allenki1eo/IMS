import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

type SparePartStockRow = {
  currentStock: number;
  minStock: number;
};

function assertNonNegativeFiniteNumber(value: number, field: string) {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${field} cannot be negative`);
  }
}

export async function listCategories(companyId: string) {
  return db.sparePartCategory.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { parts: true } },
    },
  });
}

export async function createCategory(
  companyId: string,
  data: {
    name: string;
    code: string;
    description?: string | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  const category = await db.sparePartCategory.create({
    data: {
      companyId,
      name: data.name,
      code: data.code,
      description: data.description ?? null,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "SPARE_PART_CATEGORY_CREATE",
    module: "maintenance",
    resource: "spare_part_category",
    recordId: category.id,
    newValue: { name: data.name, code: data.code },
    description: `Created spare part category: ${data.name} (${data.code})`,
    ipAddress,
    companyId,
  });

  return category;
}

export async function updateCategory(
  companyId: string,
  id: string,
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    isActive?: boolean;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.sparePartCategory.findUnique({ where: { id } });
  if (!existing) throw new Error("Spare part category not found");
  if (existing.companyId !== companyId) throw new Error("Spare part category not found");

  const updateData: Record<string, unknown> = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.sparePartCategory.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SPARE_PART_CATEGORY_UPDATE",
    module: "maintenance",
    resource: "spare_part_category",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: updateData,
    description: `Updated spare part category: ${existing.name}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function listParts(
  companyId: string,
  params: {
    search?: string;
    categoryId?: string;
    lowStock?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, categoryId, lowStock, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where: Record<string, unknown> = {
    companyId,
    ...(categoryId ? { categoryId } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { partNumber: { contains: search } },
          ],
        }
      : {}),
  };

  // lowStock filter: currentStock <= minStock
  // We'll handle this via a raw filter after fetch, but for efficiency use a different approach
  // SQLite doesn't support column comparison in where so we fetch and filter in JS for lowStock
  if (lowStock) {
    // We'll use a workaround: fetch all matching and filter
    const all = await db.sparePart.findMany({
      where,
      orderBy: { name: "asc" },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    });

    const filtered = all.filter((p: SparePartStockRow) => p.currentStock <= p.minStock);
    const total = filtered.length;
    const data = filtered.slice(skip, skip + pageSize);
    return { data, meta: { total, page, pageSize } };
  }

  const [parts, total] = await Promise.all([
    db.sparePart.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        category: {
          select: { id: true, name: true, code: true },
        },
      },
    }),
    db.sparePart.count({ where }),
  ]);

  return { data: parts, meta: { total, page, pageSize } };
}

export async function getPart(companyId: string, id: string) {
  const part = await db.sparePart.findUnique({
    where: { id },
    include: {
      category: {
        select: { id: true, name: true, code: true },
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
    },
  });

  if (!part || part.companyId !== companyId) return null;
  return part;
}

export async function createPart(
  companyId: string,
  data: {
    categoryId?: string | null;
    code: string;
    name: string;
    description?: string | null;
    partNumber?: string | null;
    uom?: string;
    currentStock?: number;
    minStock?: number;
    unitCost?: number | null;
  },
  createdById: string,
  userName: string,
  ipAddress?: string
) {
  if (data.currentStock != null) assertNonNegativeFiniteNumber(data.currentStock, "currentStock");
  if (data.minStock != null) assertNonNegativeFiniteNumber(data.minStock, "minStock");
  if (data.unitCost != null) assertNonNegativeFiniteNumber(data.unitCost, "unitCost");

  if (data.categoryId) {
    const cat = await db.sparePartCategory.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new Error("Spare part category not found");
    if (cat.companyId !== companyId) throw new Error("Spare part category not found");
  }

  const openingStock = data.currentStock ?? 0;
  const part = await db.$transaction(async (tx: any) => {
    const created = await tx.sparePart.create({
      data: {
        companyId,
        categoryId: data.categoryId ?? null,
        code: data.code,
        name: data.name,
        description: data.description ?? null,
        partNumber: data.partNumber ?? null,
        uom: data.uom ?? "PCS",
        currentStock: openingStock,
        minStock: data.minStock ?? 0,
        unitCost: data.unitCost ?? null,
        createdById,
      },
    });

    if (openingStock > 0) {
      await tx.sparePartTransaction.create({
        data: {
          companyId,
          sparePartId: created.id,
          transactionType: "OPENING",
          quantity: openingStock,
          unitCost: data.unitCost ?? null,
          totalCost: data.unitCost != null ? openingStock * data.unitCost : null,
          referenceType: "OPENING_BALANCE",
          notes: "Opening stock balance",
          createdById,
        },
      });
    }

    return created;
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "SPARE_PART_CREATE",
    module: "maintenance",
    resource: "spare_part",
    recordId: part.id,
    newValue: { code: data.code, name: data.name, currentStock: data.currentStock ?? 0 },
    description: `Created spare part: ${data.name} (${data.code})`,
    ipAddress,
    companyId,
  });

  return part;
}

export async function updatePart(
  companyId: string,
  id: string,
  data: {
    categoryId?: string | null;
    code?: string;
    name?: string;
    description?: string | null;
    partNumber?: string | null;
    uom?: string;
    minStock?: number;
    unitCost?: number | null;
    isActive?: boolean;
  },
  updatedById: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.sparePart.findUnique({ where: { id } });
  if (!existing) throw new Error("Spare part not found");
  if (existing.companyId !== companyId) throw new Error("Spare part not found");
  if (data.minStock != null) assertNonNegativeFiniteNumber(data.minStock, "minStock");
  if (data.unitCost != null) assertNonNegativeFiniteNumber(data.unitCost, "unitCost");

  if (data.categoryId) {
    const cat = await db.sparePartCategory.findUnique({ where: { id: data.categoryId } });
    if (!cat) throw new Error("Spare part category not found");
    if (cat.companyId !== companyId) throw new Error("Spare part category not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.categoryId !== undefined) updateData.categoryId = data.categoryId;
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.partNumber !== undefined) updateData.partNumber = data.partNumber;
  if (data.uom !== undefined) updateData.uom = data.uom;
  if (data.minStock !== undefined) updateData.minStock = data.minStock;
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.sparePart.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "SPARE_PART_UPDATE",
    module: "maintenance",
    resource: "spare_part",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: updateData,
    description: `Updated spare part: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function deletePart(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.sparePart.findFirst({
    where: { id, companyId },
    include: {
      _count: {
        select: { transactions: true, workItems: true },
      },
    },
  });
  if (!existing) throw new Error("Spare part not found");
  if (existing._count.transactions > 0 || existing._count.workItems > 0) {
    throw new Error("Spare part has stock history or work orders and cannot be deleted");
  }

  await db.sparePart.delete({ where: { id } });

  await createAuditLog({
    userId,
    userName,
    action: "SPARE_PART_DELETE",
    module: "maintenance",
    resource: "spare_part",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name },
    description: `Deleted spare part: ${existing.name} (${existing.code})`,
    ipAddress,
    companyId,
  });
}
