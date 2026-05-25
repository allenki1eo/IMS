import { db } from "@/lib/db";

function getDateRange(fromDate?: string, toDate?: string) {
  const from = fromDate ? new Date(`${fromDate}T00:00:00`) : new Date(new Date().getFullYear(), 0, 1);
  const to = toDate ? new Date(`${toDate}T23:59:59`) : new Date();
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error("Invalid date range");
  }
  if (from > to) {
    throw new Error("From date must be before to date");
  }
  return { from, to };
}

type AnyRow = Record<string, any>;

function sumBy<T>(rows: T[], pick: (row: T) => number | null | undefined) {
  return rows.reduce((sum, row) => sum + (pick(row) ?? 0), 0);
}

function sumLineTotal(row: { lines?: Array<{ totalCost?: number | null; totalPrice?: number | null }> | null }) {
  return sumBy(row.lines ?? [], (line) => line.totalCost ?? line.totalPrice ?? 0);
}

// ─── WAREHOUSE ─────────────────────────────────────────────

export async function getWarehouseReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

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
      include: { vehicle: { select: { plateNumber: true } }, items: true },
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

export async function getProductionReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [batches, lines, recipes] = await Promise.all([
    db.productionBatch.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { line: { select: { name: true } }, recipe: { select: { name: true } }, materials: true },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.productionLine.findMany({
      where: { companyId },
      include: { batches: { where: { createdAt: { gte: from, lte: to } } } },
    }),
    db.productionRecipe.findMany({
      where: { companyId },
      include: { materials: true, batches: { where: { createdAt: { gte: from, lte: to } } } },
    }),
  ]);

  const batchRows = batches as AnyRow[];
  const completedBatches = batchRows.filter((batch) => batch.status === "COMPLETED");
  const totalPlanned = sumBy(completedBatches, (batch) => batch.plannedQty);
  const totalActual = sumBy(completedBatches, (batch) => batch.actualQty);

  return {
    summary: {
      totalBatches: batches.length,
      completedBatches: completedBatches.length,
      totalPlannedQuantity: totalPlanned,
      totalActualQuantity: totalActual,
      yieldRate: totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : "0",
    },
    batches,
    lines: (lines as AnyRow[]).map((line) => ({ name: line.name, batchCount: line.batches.length, status: line.status })),
    recipes: (recipes as AnyRow[]).map((recipe) => ({ name: recipe.name, batchCount: recipe.batches.length, materialCount: recipe.materials.length })),
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

export async function getDispatchReport(companyId: string, fromDate?: string, toDate?: string) {
  const { from, to } = getDateRange(fromDate, toDate);

  const [orders, products] = await Promise.all([
    db.dispatchOrder.findMany({
      where: { companyId, createdAt: { gte: from, lte: to } },
      include: { lines: true, vehicle: { select: { plateNumber: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    db.fGProduct.findMany({
      where: { companyId },
      include: { lots: { where: { createdAt: { gte: from, lte: to } } } },
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
    products: (products as AnyRow[]).map((product) => ({ name: product.name, code: product.code, lotCount: product.lots.length })),
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
