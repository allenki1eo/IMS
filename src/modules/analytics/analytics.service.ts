import { db } from "@/lib/db";

type AnyRow = Record<string, any>;

function normalizeMonths(months: number) {
  if (!Number.isFinite(months)) return 6;
  return Math.min(Math.max(Math.trunc(months), 1), 24);
}

function settledValue<T>(result: PromiseSettledResult<T>, fallback: T, label: string): T {
  if (result.status === "fulfilled") return result.value;
  console.error(`[Analytics] ${label} failed:`, result.reason);
  return fallback;
}


export async function getExecutiveKPIs(companyId: string) {
  const results = await Promise.allSettled([
    db.user.count({ where: { isActive: true, companyId } }),
    db.department.count({ where: { companyId, isActive: true } }),
    db.employee.count({ where: { companyId } }),
    db.warehouse.count({ where: { companyId, isActive: true } }),
    db.item.count({ where: { companyId, isActive: true } }),
    db.stockBalance.findMany({
      where: { warehouse: { companyId }, item: { isActive: true } },
      select: {
        quantity: true,
        item: { select: { reorderPoint: true } },
      },
    }),
    db.vehicle.count({ where: { companyId, status: { not: "DECOMMISSIONED" } } }),
    db.driver.count({ where: { companyId, status: "ACTIVE" } }),
    db.tripOrder.count({ where: { companyId, status: { in: ["PLANNED", "DISPATCHED"] } } }),
    db.fuelTank.count({ where: { companyId, isActive: true } }),
    db.workOrder.count({ where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    db.maintenanceSchedule.count({ where: { companyId, nextDueAt: { lte: new Date() } } }),
    db.supplier.count({ where: { companyId } }),
    db.purchaseOrder.count({ where: { companyId, status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] } } }),
    db.purchaseOrder.aggregate({ where: { companyId, status: { not: "CANCELLED" } }, _sum: { totalAmount: true } }),
    db.productionBatch.count({ where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } } }),
    db.productionLine.count({ where: { companyId, status: "ACTIVE" } }),
    db.nonConformance.count({ where: { companyId, status: { not: "CLOSED" } } }),
    db.dispatchOrder.count({ where: { companyId, status: { in: ["CONFIRMED", "DISPATCHED"] } } }),
    db.bankAccount.aggregate({ where: { companyId, isActive: true }, _sum: { currentBalance: true } }),
    db.payment.aggregate({ where: { companyId, status: "PENDING" }, _sum: { amount: true } }),
    db.account.count({ where: { companyId, isActive: true } }),
  ]);

  const labels = [
    "totalUsers", "totalDepartments", "totalEmployees", "totalWarehouses", "totalItems",
    "lowStockBalances", "totalVehicles", "totalDrivers", "activeTrips", "totalFuelTanks",
    "openWorkOrders", "overdueSchedules", "totalSuppliers", "pendingPOs", "totalPOValue",
    "activeBatches", "totalLines", "openNCRs", "pendingDispatchOrders", "totalBankBalance",
    "pendingPayments", "totalAccounts",
  ];

  const failures = results.filter((r) => r.status === "rejected");
  if (failures.length === results.length) {
    throw new Error("All analytics KPI queries failed");
  }

  const totalUsers = settledValue(results[0], 0, labels[0]);
  const totalDepartments = settledValue(results[1], 0, labels[1]);
  const totalEmployees = settledValue(results[2], 0, labels[2]);
  const totalWarehouses = settledValue(results[3], 0, labels[3]);
  const totalItems = settledValue(results[4], 0, labels[4]);
  const lowStockBalances = settledValue(results[5], [] as AnyRow[], labels[5]) as AnyRow[];
  const totalVehicles = settledValue(results[6], 0, labels[6]);
  const totalDrivers = settledValue(results[7], 0, labels[7]);
  const activeTrips = settledValue(results[8], 0, labels[8]);
  const totalFuelTanks = settledValue(results[9], 0, labels[9]);
  const openWorkOrders = settledValue(results[10], 0, labels[10]);
  const overdueSchedules = settledValue(results[11], 0, labels[11]);
  const totalSuppliers = settledValue(results[12], 0, labels[12]);
  const pendingPOs = settledValue(results[13], 0, labels[13]);
  const totalPOValue = settledValue(results[14], { _sum: { totalAmount: null } }, labels[14]) as { _sum: { totalAmount: number | null } };
  const activeBatches = settledValue(results[15], 0, labels[15]);
  const totalLines = settledValue(results[16], 0, labels[16]);
  const openNCRs = settledValue(results[17], 0, labels[17]);
  const pendingDispatchOrders = settledValue(results[18], 0, labels[18]);
  const totalBankBalance = settledValue(results[19], { _sum: { currentBalance: null } }, labels[19]) as { _sum: { currentBalance: number | null } };
  const pendingPayments = settledValue(results[20], { _sum: { amount: null } }, labels[20]) as { _sum: { amount: number | null } };
  const totalAccounts = settledValue(results[21], 0, labels[21]);

  const lowStockCount = lowStockBalances.filter((balance) => {
    const reorderPoint = balance.item?.reorderPoint;
    return reorderPoint !== null && reorderPoint !== undefined && balance.quantity <= reorderPoint;
  }).length;

  return {
    totalUsers,
    totalDepartments,
    totalEmployees,
    totalWarehouses,
    totalItems,
    lowStockCount,
    totalVehicles,
    totalDrivers,
    activeTrips,
    totalFuelTanks,
    openWorkOrders,
    overdueSchedules,
    totalSuppliers,
    pendingPOs,
    totalPOValue: totalPOValue._sum.totalAmount || 0,
    activeBatches,
    totalLines,
    openNCRs,
    pendingDispatchOrders,
    totalBankBalance: totalBankBalance._sum.currentBalance || 0,
    pendingPayments: pendingPayments._sum.amount || 0,
    totalAccounts,
    partialFailures: failures.length,
  };
}

export async function getMonthlyTrends(companyId: string, months = 6) {
  months = normalizeMonths(months);
  const now = new Date();

  const monthRanges = Array.from({ length: months }, (_, i) => {
    const idx = months - 1 - i;
    const start = new Date(now.getFullYear(), now.getMonth() - idx, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - idx + 1, 0, 23, 59, 59);
    const label = start.toLocaleString("default", { month: "short", year: "2-digit" });
    return { start, end, label };
  });

  // Run all months in parallel instead of sequentially
  const results = await Promise.all(
    monthRanges.map(async ({ start, end, label }) => {
      const [
        grns,
        trips,
        fuelIssues,
        workOrders,
        purchaseOrders,
        batches,
        dispatchOrders,
        journalEntries,
      ] = await Promise.all([
        db.goodsReceivedNote.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
        db.tripOrder.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
        db.fuelIssue.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
        db.workOrder.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
        db.purchaseOrder.aggregate({ where: { companyId, createdAt: { gte: start, lte: end } }, _sum: { totalAmount: true } }),
        db.productionBatch.count({ where: { companyId, createdAt: { gte: start, lte: end } } }),
        db.dispatchOrder.count({ where: { companyId, createdAt: { gte: start, lte: end } } as any }),
        db.journalEntry.aggregate({ where: { companyId, entryDate: { gte: start, lte: end }, status: "POSTED" }, _sum: { totalDebit: true } }),
      ]);

      return {
        month: label,
        grns,
        trips,
        fuelIssues,
        workOrders,
        purchaseOrders: purchaseOrders._sum.totalAmount || 0,
        batches,
        dispatchOrders: dispatchOrders || 0,
        journalActivity: journalEntries._sum.totalDebit || 0,
      };
    })
  );

  return results;
}

export async function getOperationalMetrics(companyId: string) {
  const results = await Promise.allSettled([
    db.stockBalance.groupBy({ by: ["warehouseId"], where: { warehouse: { companyId } }, _sum: { quantity: true } }),
    db.tripOrder.groupBy({ by: ["status"], where: { companyId }, _count: { id: true } }),
    db.fuelIssue.groupBy({ by: ["vehicleId"], where: { companyId }, _sum: { quantityLiters: true }, orderBy: { _sum: { quantityLiters: "desc" } }, take: 10 }),
    db.workOrder.groupBy({ by: ["status"], where: { companyId }, _count: { id: true } }),
    db.qualityTest.groupBy({ by: ["result"], where: { companyId }, _count: { id: true } }),
  ]);

  if (results.every((r) => r.status === "rejected")) {
    throw new Error("All operational analytics queries failed");
  }

  const stockRows = settledValue(results[0], [] as AnyRow[], "stockByWarehouse") as AnyRow[];
  const tripRows = settledValue(results[1], [] as AnyRow[], "tripStatusBreakdown") as AnyRow[];
  const fuelRows = settledValue(results[2], [] as AnyRow[], "fuelConsumptionByVehicle") as AnyRow[];
  const maintenanceRows = settledValue(results[3], [] as AnyRow[], "maintenanceByStatus") as AnyRow[];
  const qcRows = settledValue(results[4], [] as AnyRow[], "qcResults") as AnyRow[];

  const warehouseIds = stockRows.map((stock) => stock.warehouseId);
  const warehouses = warehouseIds.length > 0
    ? await db.warehouse.findMany({ where: { id: { in: warehouseIds } }, select: { id: true, name: true } })
    : [];
  const warehouseMap = Object.fromEntries((warehouses as AnyRow[]).map((warehouse) => [warehouse.id, warehouse.name]));

  const vehicleIds = fuelRows.map((fuel) => fuel.vehicleId).filter(Boolean);
  const vehicles = vehicleIds.length > 0
    ? await db.vehicle.findMany({ where: { id: { in: vehicleIds as string[] } }, select: { id: true, plateNumber: true } })
    : [];
  const vehicleMap = Object.fromEntries((vehicles as AnyRow[]).map((vehicle) => [vehicle.id, vehicle.plateNumber]));

  return {
    stockByWarehouse: stockRows.map((stock) => ({ name: warehouseMap[stock.warehouseId] || stock.warehouseId, value: stock._sum.quantity || 0 })),
    tripStatusBreakdown: tripRows.map((trip) => ({ name: trip.status, value: trip._count.id })),
    fuelConsumptionByVehicle: fuelRows.map((fuel) => ({ name: vehicleMap[fuel.vehicleId || ""] || fuel.vehicleId || "Unassigned", value: fuel._sum.quantityLiters || 0 })),
    maintenanceByStatus: maintenanceRows.map((maintenance) => ({ name: maintenance.status, value: maintenance._count.id })),
    qcResults: qcRows.map((qc) => ({ name: qc.result || "PENDING", value: qc._count.id })),
  };
}

export async function getFinancialTrends(companyId: string, months = 6) {
  months = normalizeMonths(months);
  const now = new Date();
  const result: any[] = [];

  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
    const label = start.toLocaleString("default", { month: "short", year: "2-digit" });

    const [revenue, expenses, payments, receipts] = await Promise.all([
      db.journalEntryLine.aggregate({
        where: { account: { companyId, accountType: "REVENUE" }, journalEntry: { entryDate: { gte: start, lte: end }, status: "POSTED" } },
        _sum: { credit: true },
      }),
      db.journalEntryLine.aggregate({
        where: { account: { companyId, accountType: "EXPENSE" }, journalEntry: { entryDate: { gte: start, lte: end }, status: "POSTED" } },
        _sum: { debit: true },
      }),
      db.payment.aggregate({ where: { companyId, type: "PAYMENT", status: "COMPLETED", paymentDate: { gte: start, lte: end } }, _sum: { amount: true } }),
      db.payment.aggregate({ where: { companyId, type: "RECEIPT", status: "COMPLETED", paymentDate: { gte: start, lte: end } }, _sum: { amount: true } }),
    ]);

    result.push({
      month: label,
      revenue: revenue._sum.credit || 0,
      expenses: expenses._sum.debit || 0,
      payments: payments._sum.amount || 0,
      receipts: receipts._sum.amount || 0,
    });
  }

  return result;
}
