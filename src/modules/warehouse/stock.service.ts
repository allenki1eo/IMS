import { db } from "@/lib/db";

export async function getStockBalance(
  companyId: string,
  params: {
    warehouseId?: string;
    itemId?: string;
    lowStock?: boolean;
    page?: number;
    limit?: number;
  }
) {
  const { warehouseId, itemId, lowStock, page = 1, limit = 100 } = params;
  const skip = (page - 1) * limit;

  const where = {
    warehouse: { companyId },
    ...(warehouseId ? { warehouseId } : {}),
    ...(itemId ? { itemId } : {}),
  };

  const include = {
    item: {
      select: {
        id: true,
        code: true,
        name: true,
        itemType: true,
        reorderPoint: true,
        minStock: true,
        uom: { select: { id: true, symbol: true, code: true } },
      },
    },
    warehouse: { select: { id: true, name: true, code: true } },
    location: { select: { id: true, name: true, code: true } },
  };

  if (lowStock) {
    // For low-stock filter we need to fetch all and filter in-memory (reorderPoint is on item)
    const balances = await db.stockBalance.findMany({
      where,
      include,
      orderBy: [{ warehouse: { name: "asc" } }, { item: { name: "asc" } }],
    });
    const filtered = balances.filter((b) => {
      const reorderPoint = b.item.reorderPoint;
      if (reorderPoint === null || reorderPoint === undefined) return false;
      return b.quantity <= reorderPoint;
    });
    return {
      items: filtered,
      total: filtered.length,
      page: 1,
      limit: filtered.length,
      totalPages: 1,
    };
  }

  const [items, total] = await Promise.all([
    db.stockBalance.findMany({
      where,
      include,
      orderBy: [{ warehouse: { name: "asc" } }, { item: { name: "asc" } }],
      skip,
      take: limit,
    }),
    db.stockBalance.count({ where }),
  ]);

  return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
}

export async function getStockLedger(
  companyId: string,
  params: {
    itemId?: string;
    warehouseId?: string;
    referenceType?: string;
    page: number;
    pageSize: number;
  }
) {
  const { itemId, warehouseId, referenceType, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(itemId ? { itemId } : {}),
    ...(warehouseId ? { warehouseId } : {}),
    ...(referenceType ? { referenceType } : {}),
  };

  const [entries, total] = await Promise.all([
    db.stockLedger.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        item: { select: { id: true, name: true, code: true } },
        warehouse: { select: { id: true, name: true, code: true } },
      },
    }),
    db.stockLedger.count({ where }),
  ]);

  return { entries, total };
}
