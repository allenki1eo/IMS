import { db } from "@/lib/db";

type AnyRow = Record<string, any>;

function normalizeMonths(months: number) {
  if (!Number.isFinite(months)) return 6;
  return Math.min(Math.max(Math.trunc(months), 1), 24);
}

export async function getExecutiveKPIs(companyId: string) {
  const lowStockBalancesPromise = db.stockBalance.findMany({
    where: { warehouse: { companyId }, item: { isActive: true } },
    select: {
      quantity: true,
      item: { select: { reorderPoint: true } },
    },
  });

  const [
    totalUsers,
    totalDepartments,
    totalEmployees,
    totalWarehouses,
    totalItems,
    lowStockBalances,
    totalVehicles,
    totalDrivers,
    activeTrips,
    totalFuelTanks,
    openWorkOrders,
    overdueSchedules,
    totalSuppliers,
    pendingPOs,
    totalPOValue,
    activeBatches,
    totalLines,
    openNCRs,
    pendingDispatchOrders,
    totalBankBalance,
    pendingPayments,
    totalAccounts,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true, employee: { companyId } } }),
    db.department.count({ where: { companyId, isActive: true } as any }),
    db.employee.count({ where: { companyId } as any }),
    db.warehouse.count({ where: { companyId, isActive: true } as any }),
    db.item.count({ where: { companyId, isActive: true } as any }),
    lowStockBalancesPromise,
    db.vehicle.count({ where: { companyId, status: { not: "DECOMMISSIONED" } } as any }),
    db.driver.count({ where: { companyId, status: "ACTIVE" } as any }),
    db.tripOrder.count({ where: { companyId, status: { in: ["PLANNED", "DISPATCHED"] } } as any }),
    db.fuelTank.count({ where: { companyId, isActive: true } as any }),
    db.workOrder.count({ where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } } as any }),
    db.maintenanceSchedule.count({ where: { companyId, nextDueAt: { lte: new Date() } } as any }),
    db.supplier.count({ where: { companyId } as any }),
    db.purchaseOrder.count({ where: { companyId, status: { in: ["DRAFT", "SENT", "PARTIALLY_RECEIVED"] } } as any }),
    db.purchaseOrder.aggregate({ where: { companyId, status: { not: "CANCELLED" } } as any, _sum: { totalAmount: true } }),
    db.productionBatch.count({ where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } } as any }),
    db.productionLine.count({ where: { companyId, isActive: true } as any }),
    db.nonConformance.count({ where: { companyId, status: { not: "CLOSED" } } as any }),
    db.dispatchOrder.count({ where: { companyId, status: { in: ["CONFIRMED", "DISPATCHED"] } } as any }),
    db.bankAccount.aggregate({ where: { companyId, isActive: true } as any, _sum: { currentBalance: true } }),
    db.payment.aggregate({ where: { companyId, status: "PENDING" } as any, _sum: { amount: true } }),
    db.account.count({ where: { companyId, isActive: true } as any }),
  ]);
  const lowStockCount = (lowStockBalances as AnyRow[]).filter((balance) => {
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
  const [
    stockByWarehouse,
    tripStatusBreakdown,
    fuelConsumptionByVehicle,
    maintenanceByStatus,
    qcResults,
  ] = await Promise.all([
    db.stockBalance.groupBy({ by: ["warehouseId"], where: { warehouse: { companyId } }, _sum: { quantity: true } }),
    db.tripOrder.groupBy({ by: ["status"], where: { companyId }, _count: { id: true } }),
    db.fuelIssue.groupBy({ by: ["vehicleId"], where: { companyId } as any, _sum: { quantityLiters: true }, orderBy: { _sum: { quantityLiters: "desc" } }, take: 10 }),
    db.workOrder.groupBy({ by: ["status"], where: { companyId }, _count: { id: true } }),
    db.qualityTest.groupBy({ by: ["result"], where: { companyId }, _count: { id: true } }),
  ]);

  const stockRows = stockByWarehouse as AnyRow[];
  const tripRows = tripStatusBreakdown as AnyRow[];
  const fuelRows = fuelConsumptionByVehicle as AnyRow[];
  const maintenanceRows = maintenanceByStatus as AnyRow[];
  const qcRows = qcResults as AnyRow[];

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
