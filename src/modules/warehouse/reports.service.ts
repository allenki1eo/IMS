import { db } from "@/lib/db";

export async function getCategoryStockSummary(companyId: string) {
  const categories = await db.itemCategory.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
    include: {
      _count: { select: { items: true } },
    },
  });

  // Get total stock per category in one query
  const stockByCategory = await db.stockBalance.groupBy({
    by: ["itemId"],
    where: { item: { companyId, categoryId: { in: categories.map((c) => c.id) } } },
    _sum: { quantity: true },
  });

  const itemCategoryMap = new Map<string, string>();
  const items = await db.item.findMany({
    where: { companyId, categoryId: { in: categories.map((c) => c.id) } },
    select: { id: true, categoryId: true },
  });
  for (const item of items) {
    if (item.categoryId) itemCategoryMap.set(item.id, item.categoryId);
  }

  const categoryStockMap = new Map<string, number>();
  for (const row of stockByCategory) {
    const catId = itemCategoryMap.get(row.itemId);
    if (catId) {
      categoryStockMap.set(catId, (categoryStockMap.get(catId) || 0) + (row._sum.quantity || 0));
    }
  }

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    code: cat.code,
    description: cat.description,
    itemCount: cat._count.items,
    totalStockQty: categoryStockMap.get(cat.id) || 0,
  }));
}

export async function getItemsStockSummary(
  companyId: string,
  categoryId?: string
) {
  const items = await db.item.findMany({
    where: {
      companyId,
      isActive: true,
      ...(categoryId ? { categoryId } : {}),
    },
    orderBy: { name: "asc" },
    include: {
      category: { select: { id: true, name: true } },
      uom: { select: { id: true, name: true, symbol: true } },
      stockBalances: { select: { quantity: true } },
    },
  });

  return items.map((item) => {
    const totalStockQty = item.stockBalances.reduce(
      (sum, b) => sum + (b.quantity || 0),
      0
    );
    return {
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      itemType: item.itemType,
      category: item.category,
      uom: item.uom,
      totalStockQty,
    };
  });
}

export async function getItemLedgerWithSummary(
  companyId: string,
  itemId: string
) {
  const item = await db.item.findUnique({
    where: { id: itemId },
    include: {
      category: { select: { id: true, name: true } },
      uom: { select: { id: true, name: true, symbol: true } },
    },
  });

  if (!item || item.companyId !== companyId) {
    return null;
  }

  const entries = await db.stockLedger.findMany({
    where: { companyId, itemId },
    orderBy: { createdAt: "asc" },
    include: {
      warehouse: { select: { id: true, name: true, code: true } },
    },
  });

  // Daily summary
  const dailyMap = new Map<
    string,
    { date: string; inQty: number; outQty: number; openingBalance: number; closingBalance: number }
  >();

  for (const entry of entries) {
    const dateKey = entry.createdAt.toISOString().split("T")[0];
    const direction = getTxnDirection(entry.transactionType);
    const qty = Math.abs(entry.quantity || 0);

    if (!dailyMap.has(dateKey)) {
      dailyMap.set(dateKey, {
        date: dateKey,
        inQty: 0,
        outQty: 0,
        openingBalance: entry.balanceAfter - (direction === "IN" ? qty : -qty),
        closingBalance: entry.balanceAfter,
      });
    }

    const day = dailyMap.get(dateKey)!;
    if (direction === "IN") {
      day.inQty += qty;
    } else {
      day.outQty += qty;
    }
    day.closingBalance = entry.balanceAfter;
  }

  const dailySummary = Array.from(dailyMap.values()).map((d) => ({
    ...d,
    netMovement: d.inQty - d.outQty,
  }));

  return {
    item: {
      id: item.id,
      code: item.code,
      name: item.name,
      description: item.description,
      itemType: item.itemType,
      category: item.category,
      uom: item.uom,
    },
    entries,
    dailySummary,
  };
}

export function getTxnLabel(transactionType: string): string {
  const map: Record<string, string> = {
    RECEIPT: "GRN Receipt",
    TRANSFER_IN: "Transfer In",
    TRANSFER_OUT: "Transfer Out",
    ADJUSTMENT_IN: "Adjustment In",
    ADJUSTMENT_OUT: "Adjustment Out",
  };
  return map[transactionType] || transactionType;
}

export function getTxnDirection(
  transactionType: string
): "IN" | "OUT" | "NEUTRAL" {
  const map: Record<string, "IN" | "OUT" | "NEUTRAL"> = {
    RECEIPT: "IN",
    TRANSFER_IN: "IN",
    ADJUSTMENT_IN: "IN",
    TRANSFER_OUT: "OUT",
    ADJUSTMENT_OUT: "OUT",
  };
  return map[transactionType] || "NEUTRAL";
}
