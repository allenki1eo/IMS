import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

const LINE_FAMILIES = new Set(["BREWING", "SPIRITS"]);

type ProductLot = {
  status: string;
  quantityIn: number;
  quantityOut: number;
};

export type FgProductInput = {
  code?: string;
  name?: string;
  description?: string | null;
  uom?: string | null;
  unitPrice?: number | null;
  lineFamily?: string | null;
  abvPct?: number | null;
  packSize?: number | null;
  packUom?: string | null;
  unitsPerCase?: number | null;
  requiresTraStamp?: boolean | null;
  traStampType?: string | null;
  defaultWarehouseId?: string | null;
};

function normalizeLineFamily(value: unknown): string {
  const family = String(value ?? "BREWING").trim().toUpperCase();
  if (!LINE_FAMILIES.has(family)) throw new Error("lineFamily must be BREWING or SPIRITS");
  return family;
}

function validateAbv(abvPct: number | null | undefined, lineFamily: string) {
  if (lineFamily === "SPIRITS" && (abvPct == null || !Number.isFinite(abvPct))) {
    throw new Error("abvPct is required for SPIRITS products");
  }
  if (abvPct != null) {
    if (!Number.isFinite(abvPct) || abvPct < 0 || abvPct > 100) {
      throw new Error("abvPct must be between 0 and 100");
    }
  }
}

function resolveTraFlags(data: FgProductInput, lineFamily: string) {
  const packSize = data.packSize ?? null;
  const packUom = data.packUom?.trim() || null;
  if (packSize != null && (!Number.isFinite(packSize) || packSize <= 0)) {
    throw new Error("packSize must be greater than zero");
  }
  if (packSize != null && !packUom) {
    throw new Error("packUom is required when packSize is set");
  }
  if (packUom && packSize == null) {
    throw new Error("packSize is required when packUom is set");
  }

  const requiresTraStamp =
    data.requiresTraStamp != null
      ? Boolean(data.requiresTraStamp)
      : lineFamily === "SPIRITS" && packSize != null;

  let traStampType = data.traStampType?.trim().toUpperCase() || null;
  if (!traStampType && requiresTraStamp) {
    traStampType = lineFamily === "SPIRITS" ? "SPIRITS" : "BEER";
  }
  if (requiresTraStamp && !traStampType) {
    throw new Error("traStampType is required when requiresTraStamp is true");
  }
  if (!requiresTraStamp) {
    // Keep type if provided for future activation; still allow null
  }

  const unitsPerCase = data.unitsPerCase ?? null;
  if (unitsPerCase != null && (!Number.isInteger(unitsPerCase) || unitsPerCase <= 0)) {
    throw new Error("unitsPerCase must be a positive whole number");
  }

  return { packSize, packUom, requiresTraStamp, traStampType, unitsPerCase };
}

export async function listProducts(
  companyId: string,
  params: {
    search?: string;
    isActive?: boolean;
    lineFamily?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, isActive, lineFamily, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(isActive !== undefined ? { isActive } : {}),
    ...(lineFamily ? { lineFamily: lineFamily.toUpperCase() } : {}),
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
          qaStatus: true,
          bestBefore: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
      defaultWarehouse: { select: { id: true, code: true, name: true } },
      _count: { select: { lots: true } },
    },
  });

  if (!product) return null;
  if (product.companyId !== companyId) return null;

  const availableQty = (product.lots as ProductLot[])
    .filter((lot) => lot.status === "AVAILABLE")
    .reduce((sum, lot) => sum + (lot.quantityIn - lot.quantityOut), 0);

  return { ...product, availableQty };
}

export async function createProduct(
  companyId: string,
  data: FgProductInput,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const code = (data.code ?? "").trim().toUpperCase();
  const name = (data.name ?? "").trim();
  if (!code) throw new Error("Product code is required");
  if (!name) throw new Error("Product name is required");
  if (data.unitPrice != null && (!Number.isFinite(data.unitPrice) || data.unitPrice < 0)) {
    throw new Error("Unit price cannot be negative");
  }

  const lineFamily = normalizeLineFamily(data.lineFamily);
  validateAbv(data.abvPct ?? null, lineFamily);
  const tra = resolveTraFlags(data, lineFamily);

  if (data.defaultWarehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: data.defaultWarehouseId } });
    if (!warehouse || warehouse.companyId !== companyId) throw new Error("Warehouse not found");
  }

  const existing = await db.fGProduct.findFirst({
    where: { companyId, code },
  });
  if (existing) throw new Error("A product with this code already exists");

  const product = await db.fGProduct.create({
    data: {
      companyId,
      code,
      name,
      description: data.description?.trim() || null,
      uom: data.uom?.trim() || "UNIT",
      unitPrice: data.unitPrice ?? null,
      lineFamily,
      abvPct: data.abvPct ?? null,
      packSize: tra.packSize,
      packUom: tra.packUom,
      unitsPerCase: tra.unitsPerCase,
      requiresTraStamp: tra.requiresTraStamp,
      traStampType: tra.traStampType,
      defaultWarehouseId: data.defaultWarehouseId ?? null,
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
    newValue: { code, name, lineFamily, requiresTraStamp: tra.requiresTraStamp },
    description: `Created FG product: ${code} - ${name}`,
    ipAddress,
    companyId,
  });

  return product;
}

export async function updateProduct(
  companyId: string,
  id: string,
  data: FgProductInput & { isActive?: boolean },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.fGProduct.findUnique({ where: { id } });
  if (!existing) throw new Error("Product not found");
  if (existing.companyId !== companyId) throw new Error("Product not found");

  const code = data.code?.trim().toUpperCase();
  const name = data.name?.trim();
  if (data.code !== undefined && !code) throw new Error("Product code is required");
  if (data.name !== undefined && !name) throw new Error("Product name is required");
  if (data.unitPrice != null && (!Number.isFinite(data.unitPrice) || data.unitPrice < 0)) {
    throw new Error("Unit price cannot be negative");
  }

  const lineFamily =
    data.lineFamily !== undefined ? normalizeLineFamily(data.lineFamily) : existing.lineFamily;
  const nextAbv = data.abvPct !== undefined ? data.abvPct : existing.abvPct;
  validateAbv(nextAbv ?? null, lineFamily);

  const mergedForTra: FgProductInput = {
    ...data,
    packSize: data.packSize !== undefined ? data.packSize : existing.packSize,
    packUom: data.packUom !== undefined ? data.packUom : existing.packUom,
    unitsPerCase: data.unitsPerCase !== undefined ? data.unitsPerCase : existing.unitsPerCase,
    requiresTraStamp:
      data.requiresTraStamp !== undefined ? data.requiresTraStamp : existing.requiresTraStamp,
    traStampType: data.traStampType !== undefined ? data.traStampType : existing.traStampType,
  };
  const tra = resolveTraFlags(mergedForTra, lineFamily);

  if (data.defaultWarehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: data.defaultWarehouseId } });
    if (!warehouse || warehouse.companyId !== companyId) throw new Error("Warehouse not found");
  }

  if (code && code !== existing.code) {
    const duplicate = await db.fGProduct.findFirst({
      where: { companyId, code, NOT: { id } },
    });
    if (duplicate) throw new Error("A product with this code already exists");
  }

  const updateData: Record<string, unknown> = {};
  if (data.code !== undefined) updateData.code = code;
  if (data.name !== undefined) updateData.name = name;
  if (data.description !== undefined) updateData.description = data.description?.trim() || null;
  if (data.uom !== undefined) updateData.uom = data.uom?.trim() || "UNIT";
  if (data.unitPrice !== undefined) updateData.unitPrice = data.unitPrice;
  if (data.lineFamily !== undefined) updateData.lineFamily = lineFamily;
  if (data.abvPct !== undefined) updateData.abvPct = data.abvPct;
  if (data.packSize !== undefined || data.packUom !== undefined) {
    updateData.packSize = tra.packSize;
    updateData.packUom = tra.packUom;
  }
  if (data.unitsPerCase !== undefined) updateData.unitsPerCase = tra.unitsPerCase;
  if (
    data.requiresTraStamp !== undefined ||
    data.traStampType !== undefined ||
    data.lineFamily !== undefined ||
    data.packSize !== undefined
  ) {
    updateData.requiresTraStamp = tra.requiresTraStamp;
    updateData.traStampType = tra.traStampType;
  }
  if (data.defaultWarehouseId !== undefined) updateData.defaultWarehouseId = data.defaultWarehouseId;
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
