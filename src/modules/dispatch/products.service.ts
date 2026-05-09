import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function listProducts(
  companyId: string,
  params: {
    search?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, isActive, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search } },
            { name: { contains: search } },
          ],
        }
      : {}),
  };

  const [products, total] = await Promise.all([
    db.fGProduct.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { lots: true } },
      },
    }),
    db.fGProduct.count({ where }),
  ]);

  return { data: products, meta: { total, page, pageSize } };
}

export async function getProduct(companyId: string, id: string) {
  const product = await db.fGProduct.findUnique({
    where: { id },
    include: {
      lots: {
        select: {
          id: true,
          lotNumber: true,
          quantityIn: true,
          quantityOut: true,
          status: true,
          bestBefore: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      _count: { select: { lots: true } },
    },
  });

  if (!product) return null;
  if (product.companyId !== companyId) return null;

  const availableQty = product.lots
    .filter((l) => l.status === "AVAILABLE")
    .reduce((sum, l) => sum + (l.quantityIn - l.quantityOut), 0);

  return { ...product, availableQty };
}

export async function createProduct(
  companyId: string,
  data: {
    code: string;
    name: string;
    description?: string | null;
    uom?: string | null;
    unitPrice?: number | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.fGProduct.findFirst({
    where: { companyId, code: data.code },
  });
  if (existing) throw new Error("A product with this code already exists");

  const product = await db.fGProduct.create({
    data: {
      companyId,
      code: data.code,
      name: data.name,
      description: data.description ?? null,
      uom: data.uom ?? "UNIT",
      unitPrice: data.unitPrice ?? null,
      isActive: true,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "FG_PRODUCT_CREATE",
    module: "dispatch",
    resource: "product",
    recordId: product.id,
    newValue: { code: data.code, name: data.name },
    description: `Created FG product: ${data.code} - ${data.name}`,
    ipAddress,
    companyId,
  });

  return product;
}

export async function updateProduct(
  companyId: string,
  id: string,
  data: {
    code?: string;
    name?: string;
    description?: string | null;
    uom?: string | null;
    unitPrice?: number | null;
    isActive?: boolean;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.fGProduct.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");
  if (existing.companyId !== companyId) throw new Error("Product not found");

  if (data.code && data.code !== existing.code) {
    const duplicate = await db.fGProduct.findFirst({
      where: { companyId, code: data.code, NOT: { id } },
    });
    if (duplicate) throw new Error("A product with this code already exists");
  }

  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = data.code;
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.uom !== undefined) updateData.uom = data.uom;
  if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
  if (data.isActive !== undefined) updateData.isActive = data.isActive;

  const updated = await db.fGProduct.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "FG_PRODUCT_UPDATE",
    module: "dispatch",
    resource: "product",
    recordId: id,
    oldValue: { code: existing.code, name: existing.name, isActive: existing.isActive },
    newValue: updateData,
    description: `Updated FG product: ${existing.code}`,
    ipAddress,
    companyId,
  });

  return updated;
}
