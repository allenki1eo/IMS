import { db } from "@/lib/db";
import { eatDayBounds } from "@/modules/finance/spend-today.service";
import { todayCalendarDate } from "@/lib/timezone";

export type LineFamilyFilter = "BREWING" | "SPIRITS" | "ALL";

function normalizeLineFamily(raw?: string | null): LineFamilyFilter {
  const v = (raw ?? "ALL").toUpperCase();
  if (v === "BREWING" || v === "SPIRITS") return v;
  return "ALL";
}

/** EAT calendar-day bounds for report windows (Africa/Dar_es_Salaam). */
function getDateRange(fromDate?: string, toDate?: string) {
  const fromKey = fromDate?.trim() || `${todayCalendarDate().slice(0, 4)}-01-01`;
  const toKey = toDate?.trim() || todayCalendarDate();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(fromKey) || !/^\d{4}-\d{2}-\d{2}$/.test(toKey)) {
    throw new Error("Invalid date range");
  }
  if (fromKey > toKey) {
    throw new Error("From date must be before to date");
  }
  const from = eatDayBounds(fromKey).start;
  const to = eatDayBounds(toKey).end;
  return { from, to };
}

type AnyRow = Record<string, any>;

function sumBy<T>(rows: T[], pick: (row: T) => number | null | undefined) {
  return rows.reduce((sum, row) => {
    const raw = pick(row);
    const n = typeof raw === "number" ? raw : Number(raw ?? 0);
    return sum + (Number.isFinite(n) ? n : 0);
  }, 0);
}

function sumLineTotal(row: { lines?: Array<{ totalCost?: number | null; totalPrice?: number | null }> | null }) {
  return sumBy(row.lines ?? [], (line) => line.totalCost ?? line.totalPrice ?? 0);
}

// ─── WAREHOUSE ─────────────────────────────────────────────

export async function getWarehouseReport(
  companyId: string,
  fromDate?: string,
  toDate?: string,
  lineFamily?: string | null,
) {
  const { from, to } = getDateRange(fromDate, toDate);
  const family = normalizeLineFamily(lineFamily);

  const [grns, transfers, adjustments, stockValue] = await Promise.all([
    db.goodsReceivedNote.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: { include: { item: { select: { code: true, name: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.stockTransfer.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.stockAdjustment.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.stockBalance.aggregate({
      where: { warehouse: { companyId } },
      _sum: { quantity: true },
    }),
  ]);

  const normalizedGrns = (grns as AnyRow[]).map((grn) => ({
    ...grn,
    totalAmount: sumLineTotal(grn),
  }));

  
  const fgLots = await db.fGLot.findMany({
    where: {
      companyId,
      ...(family === "ALL" ? {} : { product: { lineFamily: family } }),
    },
    select: {
      id: true,
      lotNumber: true,
      quantityIn: true,
      quantityOut: true,
      qaStatus: true,
      product: { select: { code: true, name: true, lineFamily: true } },
    },
    take: 100,
  });

  return {
    summary: {
      totalGRNs: grns.length,
      totalTransfers: transfers.length,
      totalAdjustments: adjustments.length,
      grnTotalValue: sumBy(normalizedGrns, (grn) => grn.totalAmount),
      totalStockQuantity: stockValue._sum.quantity || 0,
    },
    grns: normalizedGrns,
    transfers,
    adjustments,
    fgLots,
    lineFamily: family,
  };
}

// ─── TRANSPORT ─────────────────────────────────────────────

export async function getTransportReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [trips, incidents, fuelConsumption] = await Promise.all([
    db.tripOrder.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { vehicle: { select: { plateNumber: true } }, driver: { select: { employee: { select: { fullName: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.vehicleIncident.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { vehicle: { select: { plateNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fuelIssue.groupBy({
      by: ["vehicleId"],
      where: { companyId, createdAt: { gte: from, lte: to } },
      _sum: { quantityLiters: true, totalCost: true },
      orderBy: { _sum: { quantityLiters: "desc" } },
      take: 20,
    }),
  ]);

  const fuelRows = fuelConsumption as AnyRow[];
  const vehicleIds = fuelRows.map((fuel) => fuel.vehicleId).filter(Boolean) as string[];
  const vehicles = vehicleIds.length > 0
    ? await db.vehicle.findMany({ where: { id: { in: vehicleIds } }, select: { id: true, plateNumber: true } })
    : [];
  const vehicleMap = Object.fromEntries((vehicles as AnyRow[]).map((vehicle) => [vehicle.id, vehicle.plateNumber]));

  return {
    summary: {
      totalTrips: trips.length,
      totalIncidents: incidents.length,
      totalFuelQuantity: sumBy(fuelRows, (fuel) => fuel._sum.quantityLiters),
      totalFuelCost: sumBy(fuelRows, (fuel) => fuel._sum.totalCost),
    },
    trips,
    incidents,
    fuelConsumption: fuelRows.map((fuel) => ({
      vehicle: vehicleMap[fuel.vehicleId || ""] || fuel.vehicleId || "Unassigned",
      quantity: fuel._sum.quantityLiters || 0,
      cost: fuel._sum.totalCost || 0,
    })),
  };
}

// ─── FUEL ──────────────────────────────────────────────────

export async function getFuelReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [receipts, issues, prices] = await Promise.all([
    db.fuelReceipt.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { tank: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fuelIssue.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { vehicle: { select: { plateNumber: true } }, tank: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fuelPrice.findMany({
      where: { companyId, effectiveFrom: { gte: from, lte: to } },
      orderBy: { effectiveFrom: "desc" },
      take: 100,
    }),
  ]);

  return {
    summary: {
      totalReceipts: receipts.length,
      totalIssues: issues.length,
      totalReceiptQuantity: sumBy(receipts as AnyRow[], (receipt) => receipt.quantityLiters),
      totalIssueQuantity: sumBy(issues as AnyRow[], (issue) => issue.quantityLiters),
      totalReceiptCost: sumBy(receipts as AnyRow[], (receipt) => receipt.totalCost),
      totalIssueCost: sumBy(issues as AnyRow[], (issue) => issue.totalCost),
    },
    receipts,
    issues,
    prices,
  };
}

// ─── MAINTENANCE ───────────────────────────────────────────

export async function getMaintenanceReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [workOrders, schedules, partsReceipts] = await Promise.all([
    db.workOrder.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { vehicle: { select: { plateNumber: true } }, plantAsset: { select: { code: true, name: true, category: true } }, items: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.maintenanceSchedule.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { vehicle: { select: { plateNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.sparePartTransaction.findMany({
      where: { companyId, createdAt: { gte: from, lte: to }, transactionType: "RECEIPT" },
      include: { sparePart: { select: { name: true, code: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
  ]);

  return {
    summary: {
      totalWorkOrders: workOrders.length,
      totalSchedules: schedules.length,
      totalPartsReceipts: partsReceipts.length,
      totalMaintenanceCost: sumBy(workOrders as AnyRow[], (workOrder) => workOrder.actualCost),
      totalEstimatedCost: sumBy(workOrders as AnyRow[], (workOrder) => workOrder.estimatedCost),
    },
    workOrders,
    schedules,
    partsReceipts,
  };
}

// ─── PROCUREMENT ───────────────────────────────────────────

export async function getProcurementReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [requests, orders, topSuppliers] = await Promise.all([
    db.purchaseRequest.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.purchaseOrder.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: true, supplier: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.purchaseOrder.groupBy({
      by: ["supplierId"],
      where: { companyId, createdAt: { gte: from, lte: to } },
      _sum: { totalAmount: true },
      _count: { id: true },
      orderBy: { _sum: { totalAmount: "desc" } },
      take: 10,
    }),
  ]);

  const supplierRows = topSuppliers as AnyRow[];
  const supplierIds = supplierRows.map((supplier) => supplier.supplierId).filter(Boolean) as string[];
  const suppliers = supplierIds.length > 0
    ? await db.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
    : [];
  const supplierMap = Object.fromEntries((suppliers as AnyRow[]).map((supplier) => [supplier.id, supplier.name]));

  const normalizedOrders = (orders as AnyRow[]).map((order) => ({
    ...order,
    totalAmount: order.totalAmount ?? sumLineTotal(order),
  }));

  return {
    summary: {
      totalRequests: requests.length,
      totalOrders: orders.length,
      totalOrderValue: sumBy(normalizedOrders, (order) => order.totalAmount),
    },
    requests,
    orders: normalizedOrders,
    topSuppliers: supplierRows.map((supplier) => ({
      supplier: supplierMap[supplier.supplierId || ""] || supplier.supplierId || "Unassigned",
      totalAmount: supplier._sum.totalAmount || 0,
      orderCount: supplier._count.id,
    })),
  };
}

// ─── PRODUCTION ────────────────────────────────────────────

/**
 * Production report for Reports → Production tab.
 *
 * Root-cause note: the previous implementation used Promise.all over
 * productionBatch (include materials) + productionLine (nested batches) +
 * productionRecipe (include materials + nested batches). Full recipe/material
 * rows SELECT every scalar — including newer columns such as lineFamily /
 * targetAbvPct / role — so a Turso DB that has not been pushed those columns
 * throws a SQLite "no such column" and the whole tab surfaces a database error.
 * Nested full batch includes on every line/recipe compound the same risk.
 *
 * Fix: only query what the UI renders (batches + summary), with a narrow
 * `select` (line/recipe name only — no materials). Line/recipe rollups are
 * derived from that batch list so we never touch drifted recipe_materials
 * columns. Empty periods return zeros/empty arrays (not an error).
 */
export async function getProductionReport(
  companyId: string,
  fromDate?: string,
  toDate?: string,
  lineFamily?: string | null,
) {
  const { from, to } = getDateRange(fromDate, toDate);
  const family = normalizeLineFamily(lineFamily);

  const batches = (await db.productionBatch.findMany({
    where: {
      companyId,
      createdAt: { gte: from, lte: to },
      ...(family === "ALL" ? {} : { batchType: family }),
    },
    select: {
      id: true,
      reference: true,
      status: true,
      plannedQty: true,
      actualQty: true,
      productName: true,
      batchType: true,
      uom: true,
      createdAt: true,
      line: { select: { name: true } },
      recipe: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  })) as AnyRow[];

  // Summary must match the listed batches. Planned qty includes PLANNED /
  // IN_PROGRESS / COMPLETED (exclude CANCELLED). Actual is coalesced null→0 so
  // open batches contribute honest zeros rather than blanking the total.
  // Previous bug: only COMPLETED were summed, so a table of planned 1000 L
  // batches showed Total Planned / Actual / Yield as 0.
  const countableBatches = batches.filter((batch) => batch.status !== "CANCELLED");
  const completedBatches = batches.filter((batch) => batch.status === "COMPLETED");
  const totalPlanned = sumBy(countableBatches, (batch) => Number(batch.plannedQty ?? 0));
  const totalActual = sumBy(countableBatches, (batch) => Number(batch.actualQty ?? 0));

  // Derive line / recipe rollups from the period's batches only (tab isolation:
  // never pull procurement or other module metrics).
  const lineMap = new Map<string, { name: string; batchCount: number; status: string }>();
  const recipeMap = new Map<string, { name: string; batchCount: number; materialCount: number }>();
  for (const batch of batches) {
    const lineName = batch.line?.name ?? "Unassigned";
    const lineEntry = lineMap.get(lineName) ?? { name: lineName, batchCount: 0, status: "ACTIVE" };
    lineEntry.batchCount += 1;
    lineMap.set(lineName, lineEntry);

    const recipeName = batch.recipe?.name ?? batch.productName ?? "Unassigned";
    const recipeEntry = recipeMap.get(recipeName) ?? { name: recipeName, batchCount: 0, materialCount: 0 };
    recipeEntry.batchCount += 1;
    recipeMap.set(recipeName, recipeEntry);
  }

  return {
    summary: {
      totalBatches: batches.length,
      completedBatches: completedBatches.length,
      totalPlannedQuantity: totalPlanned,
      totalActualQuantity: totalActual,
      yieldRate: totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : "0",
    },
    batches,
    lines: Array.from(lineMap.values()),
    recipes: Array.from(recipeMap.values()),
  };
}

// ─── QUALITY CONTROL ───────────────────────────────────────

export async function getQCReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [tests, ncrs, standards] = await Promise.all([
    db.qualityTest.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { standard: { select: { name: true } }, item: { select: { name: true } }, results: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.nonConformance.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { test: { select: { reference: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.qualityStandard.count({ where: { companyId, isActive: true } }),
  ]);

  return {
    summary: {
      totalTests: tests.length,
      passedTests: (tests as AnyRow[]).filter((test) => test.result === "PASS").length,
      failedTests: (tests as AnyRow[]).filter((test) => test.result === "FAIL").length,
      totalNCRs: ncrs.length,
      openNCRs: (ncrs as AnyRow[]).filter((ncr) => ncr.status !== "CLOSED").length,
      activeStandards: standards,
    },
    tests,
    ncrs,
  };
}

// ─── DISPATCH ──────────────────────────────────────────────

/**
 * Dispatch report for Reports → Dispatch tab.
 *
 * Avoid full FGProduct/FGLot includes: those SELECT every scalar including
 * newer MVP columns (lineFamily, qaStatus, requiresTraStamp, …). A Turso DB
 * that has not been `prisma db push`'d throws "no such column" and blanks the
 * whole tab. UI only needs product name/code + lot counts in the period.
 */
export async function getDispatchReport(
  companyId: string,
  fromDate?: string,
  toDate?: string,
  lineFamily?: string | null,
) {
  const { from, to } = getDateRange(fromDate, toDate);
  const family = normalizeLineFamily(lineFamily);

  const [orders, products] = await Promise.all([
    db.dispatchOrder.findMany({
      where: {
        companyId,
        createdAt: { gte: from, lte: to },
        ...(family === "ALL"
          ? {}
          : {
              lines: {
                some: {
                  lot: { product: { lineFamily: family } },
                },
              },
            }),
      },
      select: {
        id: true,
        reference: true,
        status: true,
        customerName: true,
        createdAt: true,
        dispatchedAt: true,
        deliveredAt: true,
        vehicle: { select: { plateNumber: true } },
        lines: {
          select: {
            id: true,
            quantity: true,
            unitPrice: true,
            totalPrice: true,
            description: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fGProduct.findMany({
      where: {
        companyId,
        ...(family === "ALL" ? {} : { lineFamily: family }),
      },
      select: {
        id: true,
        name: true,
        code: true,
        // id-only lot rows — never SELECT newer FGLot scalars (qaStatus, abvPct, …)
        lots: {
          where: { createdAt: { gte: from, lte: to } },
          select: { id: true },
        },
      },
    }),
  ]);

  const normalizedOrders: AnyRow[] = (orders as AnyRow[]).map((order) => ({
    ...order,
    totalAmount: sumLineTotal(order),
    totalQuantity: sumBy(order.lines ?? [], (line: AnyRow) => line.quantity),
  }));

  return {
    summary: {
      totalOrders: orders.length,
      totalOrderValue: sumBy(normalizedOrders, (order) => order.totalAmount),
      totalQuantityDispatched: sumBy(normalizedOrders, (order) => order.totalQuantity),
      deliveredOrders: normalizedOrders.filter((order) => order.status === "DELIVERED").length,
      pendingOrders: normalizedOrders.filter((order) => order.status === "CONFIRMED").length,
      totalProducts: products.length,
    },
    orders: normalizedOrders,
    products: (products as AnyRow[]).map((product) => ({
      name: product.name,
      code: product.code,
      lotCount: product.lots?.length ?? 0,
    })),
  };
}

// ─── FINANCE ───────────────────────────────────────────────

export async function getFinanceReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [journalEntries, payments, bankTransactions] = await Promise.all([
    db.journalEntry.findMany({
      where: { companyId, entryDate: { gte: from, lte: to }, status: "POSTED" },
      include: { lines: { include: { account: { select: { code: true, name: true, accountType: true } } } } },
      orderBy: { entryDate: "desc" },
      take: 100,
    }),
    db.payment.findMany({
      where: { companyId, paymentDate: { gte: from, lte: to } },
      include: { bankAccount: { select: { name: true } } },
      orderBy: { paymentDate: "desc" },
      take: 100,
    }),
    db.bankTransaction.findMany({
      where: { companyId, transactionDate: { gte: from, lte: to } },
      include: { bankAccount: { select: { name: true } } },
      orderBy: { transactionDate: "desc" },
      take: 100,
    }),
  ]);

  const totalDebits = sumBy(journalEntries as AnyRow[], (entry) => entry.totalDebit);
  const totalCredits = sumBy(journalEntries as AnyRow[], (entry) => entry.totalCredit);

  return {
    summary: {
      totalJournalEntries: journalEntries.length,
      totalJournalDebits: totalDebits,
      totalJournalCredits: totalCredits,
      totalPayments: payments.length,
      totalPaymentAmount: sumBy(payments as AnyRow[], (payment) => payment.amount),
      totalBankTransactions: bankTransactions.length,
      totalBankTransactionAmount: sumBy(bankTransactions as AnyRow[], (transaction) => transaction.amount),
    },
    journalEntries,
    payments,
    bankTransactions,
  };
}
