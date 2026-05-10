import { db } from "@/lib/db";

function getDateRange(fromDate?: string, toDate?: string) {
  const from = fromDate ? new Date(fromDate) : new Date(new Date().getFullYear(), 0, 1);
  const to = toDate ? new Date(toDate + "T23:59:59") : new Date();
  return { from, to };
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
      where: { } as any,
      _sum: { quantity: true },
    }),
  ]);

  const grnTotal = grns.reduce((sum, g) => sum + (g.lines?.reduce((lSum: number, l: any) => lSum + (l.totalCost || 0), 0) || 0), 0);

  return {
    summary: {
      totalGRNs: grns.length,
      totalTransfers: transfers.length,
      totalAdjustments: adjustments.length,
      grnTotalValue: grnTotal,
      totalStockQuantity: stockValue._sum.quantity || 0,
    },
    grns,
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

  const vehicleIds = fuelConsumption.map((f) => f.vehicleId).filter(Boolean) as string[];
  const vehicles = vehicleIds.length > 0
    ? await db.vehicle.findMany({ where: { id: { in: vehicleIds } }, select: { id: true, plateNumber: true } })
    : [];
  const vehicleMap = Object.fromEntries(vehicles.map((v) => [v.id, v.plateNumber]));

  return {
    summary: {
      totalTrips: trips.length,
      totalIncidents: incidents.length,
      totalFuelQuantity: fuelConsumption.reduce((sum, f) => sum + (f._sum.quantityLiters || 0), 0),
      totalFuelCost: fuelConsumption.reduce((sum, f) => sum + (f._sum.totalCost || 0), 0),
    },
    trips,
    incidents,
    fuelConsumption: fuelConsumption.map((f) => ({
      vehicle: vehicleMap[f.vehicleId || ""] || f.vehicleId,
      quantity: f._sum.quantityLiters || 0,
      cost: f._sum.totalCost || 0,
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
      totalReceiptQuantity: receipts.reduce((sum, r) => sum + (r.quantityLiters || 0), 0),
      totalIssueQuantity: issues.reduce((sum, i) => sum + (i.quantityLiters || 0), 0),
      totalReceiptCost: receipts.reduce((sum, r) => sum + (r.totalCost || 0), 0),
      totalIssueCost: issues.reduce((sum, i) => sum + (i.totalCost || 0), 0),
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
      totalMaintenanceCost: workOrders.reduce((sum, w) => sum + (w.actualCost || 0), 0),
      totalEstimatedCost: workOrders.reduce((sum, w) => sum + (w.estimatedCost || 0), 0),
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

  const supplierIds = topSuppliers.map((s) => s.supplierId).filter(Boolean) as string[];
  const suppliers = supplierIds.length > 0
    ? await db.supplier.findMany({ where: { id: { in: supplierIds } }, select: { id: true, name: true } })
    : [];
  const supplierMap = Object.fromEntries(suppliers.map((s) => [s.id, s.name]));

  return {
    summary: {
      totalRequests: requests.length,
      totalOrders: orders.length,
      totalOrderValue: orders.reduce((sum, o) => sum + (o.lines?.reduce((lSum: number, l: any) => lSum + (l.totalPrice || 0), 0) || 0), 0),
    },
    requests,
    orders,
    topSuppliers: topSuppliers.map((s) => ({
      supplier: supplierMap[s.supplierId || ""] || s.supplierId,
      totalAmount: s._sum.totalAmount || 0,
      orderCount: s._count.id,
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

  const completedBatches = batches.filter((b) => b.status === "COMPLETED");
  const totalPlanned = completedBatches.reduce((sum, b) => sum + (b.plannedQty || 0), 0);
  const totalActual = completedBatches.reduce((sum, b) => sum + (b.actualQty || 0), 0);

  return {
    summary: {
      totalBatches: batches.length,
      completedBatches: completedBatches.length,
      totalPlannedQuantity: totalPlanned,
      totalActualQuantity: totalActual,
      yieldRate: totalPlanned > 0 ? ((totalActual / totalPlanned) * 100).toFixed(1) : "0",
    },
    batches,
    lines: lines.map((l) => ({ name: l.name, batchCount: l.batches.length, status: l.status })),
    recipes: recipes.map((r) => ({ name: r.name, batchCount: r.batches.length, materialCount: r.materials.length })),
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
      passedTests: tests.filter((t) => t.result === "PASS").length,
      failedTests: tests.filter((t) => t.result === "FAIL").length,
      totalNCRs: ncrs.length,
      openNCRs: ncrs.filter((n) => n.status !== "CLOSED").length,
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

  return {
    summary: {
      totalOrders: orders.length,
      totalOrderValue: orders.reduce((sum, o) => sum + (o.lines?.reduce((lSum: number, l: any) => lSum + (l.totalPrice || 0), 0) || 0), 0),
      deliveredOrders: orders.filter((o) => o.status === "DELIVERED").length,
      pendingOrders: orders.filter((o) => o.status === "CONFIRMED").length,
      totalProducts: products.length,
    },
    orders,
    products: products.map((p) => ({ name: p.name, code: p.code, lotCount: p.lots.length })),
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

  const totalDebits = journalEntries.reduce((sum, je) => sum + je.totalDebit, 0);
  const totalCredits = journalEntries.reduce((sum, je) => sum + je.totalCredit, 0);

  return {
    summary: {
      totalJournalEntries: journalEntries.length,
      totalJournalDebits: totalDebits,
      totalJournalCredits: totalCredits,
      totalPayments: payments.length,
      totalPaymentAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalBankTransactions: bankTransactions.length,
      totalBankTransactionAmount: bankTransactions.reduce((sum, t) => sum + t.amount, 0),
    },
    journalEntries,
    payments,
    bankTransactions,
  };
}
