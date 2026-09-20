import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { parseAppDate } from "@/lib/timezone";

const QA_STATUSES = new Set(["PENDING", "RELEASED", "HOLD"]);

type LotWithProduct = {
  quantityIn: number;
  quantityOut: number;
};

export async function listLots(
  companyId: string,
  params: {
    productId?: string;
    status?: string;
    qaStatus?: string;
    page: number;
    pageSize: number;
  }
) {
  const { productId, status, qaStatus, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(productId ? { productId } : {}),
    ...(status ? { status } : {}),
    ...(qaStatus ? { qaStatus } : {}),
  };

  const [lots, total] = await Promise.all([
    db.fGLot.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        product: {
          select: {
            id: true,
            code: true,
            name: true,
            uom: true,
            lineFamily: true,
            requiresTraStamp: true,
            traStampType: true,
            abvPct: true,
          },
        },
        warehouse: { select: { id: true, code: true, name: true } },
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
      product: {
        select: {
          id: true,
          code: true,
          name: true,
          uom: true,
          lineFamily: true,
          requiresTraStamp: true,
          traStampType: true,
          abvPct: true,
        },
      },
      warehouse: { select: { id: true, code: true, name: true } },
      productionBatch: { select: { id: true, reference: true, productName: true, status: true } },
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
    lotNumber: string;
    quantityIn: number;
    unitCost?: number | null;
    bestBefore?: string | null;
    warehouseId: string;
    productionBatchId?: string | null;
    abvPct?: number | null;
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

  const lotNumber = data.lotNumber?.trim();
  if (!lotNumber) throw new Error("Lot number is required");

  if (!data.warehouseId?.trim()) throw new Error("Warehouse is required");
  const warehouse = await db.warehouse.findUnique({ where: { id: data.warehouseId } });
  if (!warehouse) throw new Error("Warehouse not found");
  if (warehouse.companyId !== companyId) throw new Error("Warehouse not found");

  if (!Number.isFinite(data.quantityIn) || data.quantityIn <= 0) {
    throw new Error("Quantity must be greater than zero");
  }
  if (data.unitCost != null && (!Number.isFinite(data.unitCost) || data.unitCost < 0)) {
    throw new Error("Unit cost cannot be negative");
  }
  if (data.bestBefore) {
    try {
      parseAppDate(data.bestBefore);
    } catch {
      throw new Error("Best before date is invalid");
    }
  }

  if (data.productionBatchId) {
    const batch = await db.productionBatch.findUnique({ where: { id: data.productionBatchId } });
    if (!batch || batch.companyId !== companyId) throw new Error("Production batch not found");
  }

  const abvPct = data.abvPct != null ? data.abvPct : product.abvPct;
  if (abvPct != null && (!Number.isFinite(abvPct) || abvPct < 0 || abvPct > 100)) {
    throw new Error("abvPct must be between 0 and 100");
  }

  const lot = await db.fGLot.create({
    data: {
      companyId,
      productId: data.productId,
      lotNumber,
      quantityIn: data.quantityIn,
      quantityOut: 0,
      unitCost: data.unitCost ?? null,
      bestBefore: data.bestBefore ? parseAppDate(data.bestBefore) : null,
      warehouseId: data.warehouseId,
      productionBatchId: data.productionBatchId ?? null,
      abvPct: abvPct ?? null,
      qaStatus: "PENDING",
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
      lotNumber,
      quantityIn: data.quantityIn,
      warehouseId: data.warehouseId,
      qaStatus: "PENDING",
    },
    description: `Received FG lot for product: ${product.code} lot: ${lotNumber}`,
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
    qaStatus?: string;
    abvPct?: number | null;
    productionBatchId?: string | null;
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
  if (data.lotNumber !== undefined) {
    const lotNumber = data.lotNumber?.trim();
    if (!lotNumber) throw new Error("Lot number is required");
  }
  if (data.unitCost != null && (!Number.isFinite(data.unitCost) || data.unitCost < 0)) {
    throw new Error("Unit cost cannot be negative");
  }
  if (data.bestBefore) {
    try {
      parseAppDate(data.bestBefore);
    } catch {
      throw new Error("Best before date is invalid");
    }
  }
  if (data.status === "AVAILABLE" && existing.quantityOut >= existing.quantityIn) {
    throw new Error("Depleted lots cannot be marked available");
  }
  if (data.qaStatus !== undefined && !QA_STATUSES.has(data.qaStatus)) {
    throw new Error("qaStatus must be PENDING, RELEASED, or HOLD");
  }
  if (data.abvPct != null && (!Number.isFinite(data.abvPct) || data.abvPct < 0 || data.abvPct > 100)) {
    throw new Error("abvPct must be between 0 and 100");
  }
  if (data.productionBatchId) {
    const batch = await db.productionBatch.findUnique({ where: { id: data.productionBatchId } });
    if (!batch || batch.companyId !== companyId) throw new Error("Production batch not found");
  }

  const updateData: Record<string, unknown> = {};
  if (data.lotNumber !== undefined) {
    const lotNumber = data.lotNumber?.trim();
    if (!lotNumber) throw new Error("Lot number is required");
    updateData.lotNumber = lotNumber;
  }
  if (data.unitCost !== undefined) updateData.unitCost = data.unitCost;
  if (data.bestBefore !== undefined)
    updateData.bestBefore = data.bestBefore ? parseAppDate(data.bestBefore) : null;
  if (data.warehouseId !== undefined) updateData.warehouseId = data.warehouseId;
  if (data.status !== undefined) updateData.status = data.status;
  if (data.abvPct !== undefined) updateData.abvPct = data.abvPct;
  if (data.productionBatchId !== undefined) updateData.productionBatchId = data.productionBatchId;
  if (data.notes !== undefined) updateData.notes = data.notes;

  if (data.qaStatus !== undefined && data.qaStatus !== existing.qaStatus) {
    updateData.qaStatus = data.qaStatus;
    if (data.qaStatus === "RELEASED") {
      updateData.qaReleasedAt = new Date();
      updateData.qaReleasedById = userId;
    } else {
      updateData.qaReleasedAt = null;
      updateData.qaReleasedById = null;
    }
  }

  const updated = await db.fGLot.update({ where: { id }, data: updateData });

  await createAuditLog({
    userId,
    userName,
    action: "FG_LOT_UPDATE",
    module: "dispatch",
    resource: "lot",
    recordId: id,
    oldValue: { status: existing.status, qaStatus: existing.qaStatus, lotNumber: existing.lotNumber },
    newValue: updateData,
    description: `Updated FG lot${existing.lotNumber ? " " + existing.lotNumber : ""}`,
    ipAddress,
    companyId,
  });

  return updated;
}

export async function releaseLotQa(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress?: string
) {
  return updateLot(
    companyId,
    id,
    { qaStatus: "RELEASED" },
    userId,
    userName,
    ipAddress
  );
}
