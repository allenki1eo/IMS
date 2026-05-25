import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

type LotWithProduct = {
  quantityIn: number;
  quantityOut: number;
};

export async function listLots(
  companyId: string,
  params: {
    productId?: string;
    status?: string;
    page: number;
    pageSize: number;
  }
) {
  const { productId, status, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(productId ? { productId } : {}),
    ...(status ? { status } : {}),
  };

  const [lots, total] = await Promise.all([
    db.fGLot.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: { select: { id: true, code: true, name: true, uom: true } },
      },
    }),
    db.fGLot.count({ where }),
  ]);

  const data = (lots as LotWithProduct[]).map((lot) => ({
    ...lot,
    availableQty: lot.quantityIn - lot.quantityOut,
  }));

  return { data, meta: { total, page, pageSize } };
}

export async function getLot(companyId: string, id: string) {
  const lot = await db.fGLot.findUnique({
    where: { id },
    include: {
      product: { select: { id: true, code: true, name: true, uom: true } },
      warehouse: { select: { id: true, code: true, name: true } },
      dispatchLines: {
        include: {
          order: { select: { id: true, reference: true, customerName: true } },
        },
      },
      _count: { select: { dispatchLines: true } },
    },
  });

  if (!lot) return null;
  if (lot.companyId !== companyId) return null;

  return { ...lot, availableQty: lot.quantityIn - lot.quantityOut };
}

export async function receiveLot(
  companyId: string,
  data: {
    productId: string;
    lotNumber?: string | null;
    quantityIn: number;
    unitCost?: number | null;
    bestBefore?: string | null;
    warehouseId?: string | null;
    notes?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const product = await db.fGProduct.findUnique({ where: { id: data.productId } });
  if (!product) throw new Error("Product not found");
  if (product.companyId !== companyId) throw new Error("Product not found");
  if (!product.isActive) throw new Error("Product is inactive");

  if (data.warehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw new Error("Warehouse not found");
    if (warehouse.companyId !== companyId) throw new Error("Warehouse not found");
  }

  if (!Number.isFinite(data.quantityIn) || data.quantityIn <= 0) throw new Error("Quantity must be greater than zero");
  if (data.unitCost != null && (!Number.isFinite(data.unitCost) || data.unitCost < 0)) {
    throw new Error("Unit cost cannot be negative");
  }
  if (data.bestBefore) {
    const bestBefore = new Date(data.bestBefore);
    if (Number.isNaN(bestBefore.getTime())) throw new Error("Best before date is invalid");
  }

  const lot = await db.fGLot.create({
    data: {
      companyId,
      productId: data.productId,
      lotNumber: data.lotNumber ?? null,
      quantityIn: data.quantityIn,
      quantityOut: 0,
      unitCost: data.unitCost ?? null,
      bestBefore: data.bestBefore ? new Date(data.bestBefore) : null,
      warehouseId: data.warehouseId ?? null,
      status: "AVAILABLE",
      notes: data.notes ?? null,
      createdById: userId,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "FG_LOT_RECEIVED",
    module: "dispatch",
    resource: "lot",
    recordId: lot.id,
    newValue: {
      productId: data.productId,
      productCode: product.code,
      lotNumber: data.lotNumber,
      quantityIn: data.quantityIn,
    },
    description: `Received FG lot for product: ${product.code}${data.lotNumber ? " lot: " + data.lotNumber : ""}`,
    ipAddress,
    companyId,
  });

  return lot;
}

export async function updateLot(
  companyId: string,
  id: string,
  data: {
    lotNumber?: string | null;
    unitCost?: number | null;
    bestBefore?: string | null;
    warehouseId?: string | null;
    status?: string;
    notes?: string | null;
  },
  userId: string,
  userName: string,
  ipAddress?: string
) {
  const existing = await db.fGLot.findUnique({ where: { id } });
  if (!existing) throw new Error("Lot not found");
  if (existing.companyId !== companyId) throw new Error("Lot not found");

  if (data.warehouseId) {
    const warehouse = await db.warehouse.findUnique({ where: { id: data.warehouseId } });
    if (!warehouse) throw new Error("Warehouse not found");
    if (warehouse.companyId !== companyId) throw new Error("Warehouse not found");
  }
  if (data.unitCost != null && (!Number.isFinite(data.unitCost) || data.unitCost < 0)) {
    throw new Error("Unit cost cannot be negative");
  }
  if (data.bestBefore) {
    const bestBefore = new Date(data.bestBefore);
    if (Number.isNaN(bestBefore.getTime())) throw new Error("Best before date is invalid");
  }
  if (data.status === "AVAILABLE" && existing.quantityOut >= existing.quantityIn) {
    throw new Error("Depleted lots cannot be marked available");
  }

  const updateData: Record<string, unknown> = {};
  if (data.lotNumber !== undefined) updateData.lotNumber = data.lotNumber;
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
  if (data.bestBefore !== undefined)
    updateData.bestBefore = data.bestBefore ? new Date(data.bestBefore) : null;
  if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.notes !== undefined) updateData.notes = data.notes;

  const updated = await db.fGLot.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "FG_LOT_UPDATE",
    module: "dispatch",
    resource: "lot",
    recordId: id,
    oldValue: { status: existing.status, lotNumber: existing.lotNumber },
    newValue: updateData,
    description: `Updated FG lot${existing.lotNumber ? " " + existing.lotNumber : ""}`,
    ipAddress,
    companyId,
  });

  return updated;
}
