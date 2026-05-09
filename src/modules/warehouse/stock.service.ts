import { db } from "@/lib/db";

export async function getStockBalance(
  companyId: string,
  params: {
    warehouseId?: string;
    itemId?: string;
    lowStock?: boolean;
  }
) {
  const { warehouseId, itemId, lowStock } = params;

  const balances = await db.stockBalance.findMany({
    where: {
      warehouse: { companyId },
      ...(warehouseId ? { warehouseId } : {}),
      ...(itemId ? { itemId } : {}),
    },
    include: {
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
    },
    orderBy: [{ warehouse: { name: "asc" } }, { item: { name: "asc" } }],
  });

  if (lowStock) {
    return balances.filter((b) => {
      const reorderPoint = b.item.reorderPoint;
      if (reorderPoint === null || reorderPoint === undefined) return false;
      return b.quantity <= reorderPoint;
    });
  }

  return balances;
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
