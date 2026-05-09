import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listItems(
  companyId: string,
  params: {
    search?: string;
    categoryId?: string;
    itemType?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, categoryId, itemType, isActive, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
    ...(categoryId ? { categoryId } : {}),
    ...(itemType ? { itemType } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
  };

  const [items, total] = await Promise.all([
    db.item.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        category: { select: { id: true, name: true, code: true } },
        uom: { select: { id: true, name: true, code: true, symbol: true } },
      },
    }),
    db.item.count({ where }),
  ]);

  return { items, total };
}

export async function getItemById(id: string) {
  return db.item.findUnique({
    where: { id },
    include: {
      category: { select: { id: true, name: true, code: true } },
      uom: { select: { id: true, name: true, code: true, symbol: true } },
      stockBalances: {
        include: {
          warehouse: { select: { id: true, name: true, code: true } },
          location: { select: { id: true, name: true, code: true } },
        },
      },
    },
  });
}

export async function createItem(params: {
  companyId: string;
  code: string;
  name: string;
  description?: string | null;
  categoryId?: string | null;
  uomId: string;
  itemType?: string;
  minStock?: number;
  maxStock?: number | null;
  reorderPoint?: number | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const item = await db.item.create({
    data: {
      companyId: data.companyId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      categoryId: data.categoryId ?? null,
      uomId: data.uomId,
      itemType: data.itemType ?? "RAW_MATERIAL",
      minStock: data.minStock ?? 0,
      maxStock: data.maxStock ?? null,
      reorderPoint: data.reorderPoint ?? null,
      createdById,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "ITEM_CREATE",
    module: "warehouse",
    resource: "item",
    recordId: item.id,
    newValue: { code: data.code, name: data.name, itemType: data.itemType },
    description: `Created item: ${data.name} (${data.code})`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return item;
}

export async function updateItem(params: {
  id: string;
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    categoryId?: string | null;
    uomId?: string;
    itemType?: string;
    minStock?: number;
    maxStock?: number | null;
    reorderPoint?: number | null;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.item.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");

  const updated = await db.item.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "ITEM_UPDATE",
    module: "warehouse",
    resource: "item",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: data,
    description: `Updated item: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function setItemStatus(params: {
  id: string;
  isActive: boolean;
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, isActive, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.item.findUnique({ where: { id } });
  if (!existing) throw new Error("Item not found");

  await db.item.update({ where: { id }, data: { isActive } });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "ITEM_STATUS_CHANGE",
    module: "warehouse",
    resource: "item",
    recordId: id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive },
    description: `Set item ${existing.name} to ${isActive ? "active" : "inactive"}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });
}

export async function listCategories(
  companyId: string,
  params: { search?: string }
) {
  const { search } = params;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
          ],
        }
      : {}),
  };

  return db.itemCategory.findMany({
    where,
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true } },
      parent: { select: { id: true, name: true, code: true } },
    },
  });
}

export async function createCategory(params: {
  companyId: string;
  name: string;
  code: string;
  description?: string | null;
  parentId?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const category = await db.itemCategory.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      code: data.code,
      description: data.description ?? null,
      parentId: data.parentId ?? null,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "CATEGORY_CREATE",
    module: "warehouse",
    resource: "item_category",
    recordId: category.id,
    newValue: { name: data.name, code: data.code },
    description: `Created item category: ${data.name}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return category;
}

export async function updateCategory(params: {
  id: string;
  data: {
    name?: string;
    code?: string;
    description?: string | null;
    parentId?: string | null;
    isActive?: boolean;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.itemCategory.findUnique({ where: { id } });
  if (!existing) throw new Error("Category not found");

  const updated = await db.itemCategory.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "CATEGORY_UPDATE",
    module: "warehouse",
    resource: "item_category",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code },
    newValue: data,
    description: `Updated item category: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}

export async function listUOMs(
  companyId: string,
  params: { search?: string }
) {
  const { search } = params;

  const where = {
    companyId,
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { code: { contains: search } },
            { symbol: { contains: search } },
          ],
        }
      : {}),
  };

  return db.unitOfMeasure.findMany({
    where,
    orderBy: { name: "asc" },
  });
}

export async function createUOM(params: {
  companyId: string;
  name: string;
  code: string;
  symbol: string;
  isBase?: boolean;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const uom = await db.unitOfMeasure.create({
    data: {
      companyId: data.companyId,
      name: data.name,
      code: data.code,
      symbol: data.symbol,
      isBase: data.isBase ?? false,
    },
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "UOM_CREATE",
    module: "warehouse",
    resource: "uom",
    recordId: uom.id,
    newValue: { name: data.name, code: data.code, symbol: data.symbol },
    description: `Created unit of measure: ${data.name} (${data.symbol})`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return uom;
}

export async function updateUOM(params: {
  id: string;
  data: {
    name?: string;
    code?: string;
    symbol?: string;
    isBase?: boolean;
    isActive?: boolean;
  };
  updatedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, data, updatedById, userName, ipAddress, userAgent } = params;

  const existing = await db.unitOfMeasure.findUnique({ where: { id } });
  if (!existing) throw new Error("UOM not found");

  const updated = await db.unitOfMeasure.update({ where: { id }, data });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "UOM_UPDATE",
    module: "warehouse",
    resource: "uom",
    recordId: id,
    oldValue: { name: existing.name, code: existing.code, symbol: existing.symbol },
    newValue: data,
    description: `Updated unit of measure: ${existing.name}`,
    ipAddress,
    userAgent,
    companyId: existing.companyId,
  });

  return updated;
}
