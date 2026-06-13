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

// ─── Daily Store Report ───────────────────────────────────────────────────────
// Mirrors the physical "Movement of Stock as on <date>" sheet:
// Opening | Received from Supplier | Returned to Supplier | Issued to Production |
// Return from Production | Other +/- | Closing | Stock Take | Confirmation |
// Weekly Usage | UoM | Lead Time | Weeks to Depletion — grouped by category.

const RECEIVE_TYPES = ["RECEIPT"];
const RETURN_TO_SUPPLIER_TYPES = ["RETURN_TO_SUPPLIER"];
const ISSUE_TO_PRODUCTION_TYPES = ["ISSUE_TO_PRODUCTION"];
const RETURN_FROM_PRODUCTION_TYPES = ["RETURN_FROM_PRODUCTION"];
const OTHER_TYPES = ["ADJUSTMENT_IN", "ADJUSTMENT_OUT", "TRANSFER_IN", "TRANSFER_OUT", "OTHER_ADDITION", "OTHER_DEDUCTION"];

export interface DailyStoreReportRow {
  itemId: string;
  code: string;
  name: string;
  categoryName: string;
  uomSymbol: string;
  opening: number;
  receivedFromSupplier: number;
  returnedToSupplier: number;
  issuedToProduction: number;
  returnedFromProduction: number;
  otherMovement: number;
  closing: number;
  stockTakeQty: number | null;
  confirmation: string | null;
  projectedWeeklyUsage: number | null;
  leadTimeWeeks: number | null;
  weeksToDepletion: number | null;
}

export async function getDailyStoreReport(params: {
  companyId: string;
  date: Date;
  warehouseId?: string;
}) {
  const { companyId, date, warehouseId } = params;

  const dayStart = new Date(date);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(date);
  dayEnd.setHours(23, 59, 59, 999);

  const warehouseFilter = warehouseId ? { warehouseId } : {};

  const [items, dayLedger, currentBalances, latestEntries, stockTakes] = await Promise.all([
    db.item.findMany({
      where: { companyId, isActive: true },
      select: {
        id: true, code: true, name: true,
        projectedWeeklyUsage: true, leadTimeWeeks: true, confirmationNote: true,
        category: { select: { name: true } },
        uom: { select: { symbol: true } },
      },
      orderBy: [{ categoryId: "asc" }, { name: "asc" }],
    }),
    // All movements on the report day
    db.stockLedger.findMany({
      where: { companyId, ...warehouseFilter, createdAt: { gte: dayStart, lte: dayEnd } },
      select: { itemId: true, transactionType: true, quantity: true },
    }),
    db.stockBalance.findMany({
      where: { item: { companyId }, ...warehouseFilter },
      select: { itemId: true, quantity: true },
    }),
    // Latest ledger entry per item up to end of day → closing balance as of that date
    db.stockLedger.findMany({
      where: { companyId, ...warehouseFilter, createdAt: { lte: dayEnd } },
      orderBy: { createdAt: "desc" },
      select: { itemId: true, warehouseId: true, balanceAfter: true, createdAt: true },
    }),
    // Stock take counts applied on the report day
    db.stockAdjustmentLine.findMany({
      where: {
        adjustment: {
          companyId, ...warehouseFilter,
          status: "APPLIED",
          appliedAt: { gte: dayStart, lte: dayEnd },
        },
      },
      select: { itemId: true, countedQty: true },
    }),
  ]);

  // Movements after the report day — subtracted from current balance when the
  // item has no ledger history (static balances) to reconstruct historic closing
  const movementByItem = new Map<string, Record<string, number>>();
  for (const entry of dayLedger) {
    const rec = movementByItem.get(entry.itemId) ?? {};
    rec[entry.transactionType] = (rec[entry.transactionType] ?? 0) + entry.quantity;
    movementByItem.set(entry.itemId, rec);
  }

  // Closing per item: latest balanceAfter ≤ dayEnd per item+warehouse, summed.
  // Items with no ledger entries fall back to the current static balance.
  const seenItemWarehouse = new Set<string>();
  const closingByItem = new Map<string, number>();
  const itemsWithLedger = new Set<string>();
  for (const entry of latestEntries) {
    const key = `${entry.itemId}:${entry.warehouseId}`;
    if (seenItemWarehouse.has(key)) continue;
    seenItemWarehouse.add(key);
    itemsWithLedger.add(entry.itemId);
    closingByItem.set(entry.itemId, (closingByItem.get(entry.itemId) ?? 0) + entry.balanceAfter);
  }
  const currentByItem = new Map<string, number>();
  for (const b of currentBalances) {
    currentByItem.set(b.itemId, (currentByItem.get(b.itemId) ?? 0) + b.quantity);
  }

  const stockTakeByItem = new Map<string, number>();
  for (const st of stockTakes) {
    stockTakeByItem.set(st.itemId, (stockTakeByItem.get(st.itemId) ?? 0) + st.countedQty);
  }

  const sumTypes = (rec: Record<string, number> | undefined, types: string[]) =>
    types.reduce((acc, t) => acc + Math.abs(rec?.[t] ?? 0), 0);
  const netTypes = (rec: Record<string, number> | undefined, types: string[]) =>
    types.reduce((acc, t) => acc + (rec?.[t] ?? 0), 0);

  const rows: DailyStoreReportRow[] = items.map((item) => {
    const rec = movementByItem.get(item.id);
    const receivedFromSupplier = sumTypes(rec, RECEIVE_TYPES);
    const returnedToSupplier = sumTypes(rec, RETURN_TO_SUPPLIER_TYPES);
    const issuedToProduction = sumTypes(rec, ISSUE_TO_PRODUCTION_TYPES);
    const returnedFromProduction = sumTypes(rec, RETURN_FROM_PRODUCTION_TYPES);
    const otherMovement = netTypes(rec, OTHER_TYPES);

    const closing = itemsWithLedger.has(item.id)
      ? closingByItem.get(item.id) ?? 0
      : currentByItem.get(item.id) ?? 0;

    const netDay = receivedFromSupplier - returnedToSupplier - issuedToProduction + returnedFromProduction + otherMovement;
    const opening = closing - netDay;

    const usage = item.projectedWeeklyUsage;
    const weeksToDepletion = usage && usage > 0 ? Math.round((closing / usage) * 10) / 10 : null;

    return {
      itemId: item.id,
      code: item.code,
      name: item.name,
      categoryName: item.category?.name ?? "Uncategorised",
      uomSymbol: item.uom.symbol,
      opening,
      receivedFromSupplier,
      returnedToSupplier,
      issuedToProduction,
      returnedFromProduction,
      otherMovement,
      closing,
      stockTakeQty: stockTakeByItem.get(item.id) ?? null,
      confirmation: item.confirmationNote,
      projectedWeeklyUsage: item.projectedWeeklyUsage,
      leadTimeWeeks: item.leadTimeWeeks,
      weeksToDepletion,
    };
  });

  // Group rows by category, preserving item order
  const groups: Array<{ category: string; rows: DailyStoreReportRow[] }> = [];
  const groupIndex = new Map<string, number>();
  for (const row of rows) {
    let idx = groupIndex.get(row.categoryName);
    if (idx === undefined) {
      idx = groups.length;
      groupIndex.set(row.categoryName, idx);
      groups.push({ category: row.categoryName, rows: [] });
    }
    groups[idx].rows.push(row);
  }

  return { date: dayStart.toISOString(), warehouseId: warehouseId ?? null, groups };
}
