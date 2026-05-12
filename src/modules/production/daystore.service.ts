import { db } from "@/lib/db";

export interface DaystorePlan {
  date: string;
  batches: Array<{
    id: string;
    reference: string;
    productName: string;
    plannedQty: number;
    uom: string;
    status: string;
    lineName: string | null;
  }>;
  materials: Array<{
    itemId: string | null;
    itemCode: string | null;
    description: string;
    uom: string;
    requiredQty: number;
    totalStock: number;
    daystoreStock: number;
    shortfall: number;
    status: "OK" | "SHORTAGE" | "UNKNOWN";
  }>;
}

function startOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfDay(d: Date) {
  const date = new Date(d);
  date.setHours(23, 59, 59, 999);
  return date;
}

export async function getDaystorePlan(
  companyId: string,
  date: Date
): Promise<DaystorePlan> {
  const from = startOfDay(date);
  const to = endOfDay(date);

  const batches = await db.productionBatch.findMany({
    where: {
      companyId,
      plannedStart: { gte: from, lte: to },
      status: { in: ["PLANNED", "IN_PROGRESS"] },
    },
    include: {
      line: { select: { name: true } },
      materials: true,
    },
    orderBy: { plannedStart: "asc" },
  });

  const batchSummaries = batches.map((b) => ({
    id: b.id,
    reference: b.reference,
    productName: b.productName,
    plannedQty: b.plannedQty,
    uom: b.uom,
    status: b.status,
    lineName: b.line?.name ?? null,
  }));

  // Aggregate materials across all batches
  const materialMap = new Map<
    string,
    {
      itemId: string | null;
      itemCode: string | null;
      description: string;
      uom: string;
      requiredQty: number;
    }
  >();

  for (const batch of batches) {
    for (const mat of batch.materials) {
      const key = `${mat.itemId ?? ""}|${mat.itemCode ?? ""}|${mat.description}|${mat.uom}`;
      const existing = materialMap.get(key);
      if (existing) {
        existing.requiredQty += mat.plannedQty;
      } else {
        materialMap.set(key, {
          itemId: mat.itemId ?? null,
          itemCode: mat.itemCode ?? null,
          description: mat.description,
          uom: mat.uom,
          requiredQty: mat.plannedQty,
        });
      }
    }
  }

  // Resolve item IDs for stock lookup
  const itemIds: string[] = [];
  const itemCodes: string[] = [];
  for (const mat of materialMap.values()) {
    if (mat.itemId) itemIds.push(mat.itemId);
    else if (mat.itemCode) itemCodes.push(mat.itemCode);
  }

  // Find items by code
  const itemsByCode =
    itemCodes.length > 0
      ? await db.item.findMany({
          where: { companyId, code: { in: itemCodes } },
          select: { id: true, code: true },
        })
      : [];

  const codeToItemId = new Map(itemsByCode.map((i) => [i.code, i.id]));

  // Get all relevant item IDs for stock lookup
  const allItemIds = Array.from(
    new Set([
      ...itemIds,
      ...itemsByCode.map((i) => i.id),
    ])
  );

  // Fetch stock balances
  const stockBalances =
    allItemIds.length > 0
      ? await db.stockBalance.findMany({
          where: { itemId: { in: allItemIds } },
          include: { warehouse: true },
        })
      : [];

  const totalStockByItem = new Map<string, number>();
  const daystoreStockByItem = new Map<string, number>();

  for (const sb of stockBalances) {
    const currentTotal = totalStockByItem.get(sb.itemId) ?? 0;
    totalStockByItem.set(sb.itemId, currentTotal + (sb.quantity ?? 0));

    if (sb.warehouse?.warehouseType === "DAYSTORE") {
      const currentDaystore = daystoreStockByItem.get(sb.itemId) ?? 0;
      daystoreStockByItem.set(sb.itemId, currentDaystore + (sb.quantity ?? 0));
    }
  }

  // Build material rows
  const materials: DaystorePlan["materials"] = [];
  for (const mat of materialMap.values()) {
    const resolvedItemId = mat.itemId ?? codeToItemId.get(mat.itemCode ?? "") ?? null;
    const totalStock = resolvedItemId ? (totalStockByItem.get(resolvedItemId) ?? 0) : 0;
    const daystoreStock = resolvedItemId ? (daystoreStockByItem.get(resolvedItemId) ?? 0) : 0;
    const shortfall = Math.max(0, mat.requiredQty - daystoreStock);

    materials.push({
      itemId: mat.itemId,
      itemCode: mat.itemCode,
      description: mat.description,
      uom: mat.uom,
      requiredQty: mat.requiredQty,
      totalStock,
      daystoreStock,
      shortfall,
      status: resolvedItemId ? (shortfall > 0 ? "SHORTAGE" : "OK") : "UNKNOWN",
    });
  }

  materials.sort((a, b) => a.description.localeCompare(b.description));

  return {
    date: from.toISOString().split("T")[0],
    batches: batchSummaries,
    materials,
  };
}
