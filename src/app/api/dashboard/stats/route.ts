import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success, serverError } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const [
      userCount,
      employeeCount,
      branchCount,
      departmentCount,
      roleCount,
      pendingApprovals,
      warehouseCount,
      lowStockItems,
      activeVehicles,
      activeDrivers,
      activeTrips,
      openIncidents,
      activeFuelTanks,
      openWorkOrders,
      pendingPurchaseRequests,
      openPurchaseOrders,
      activeProductionBatches,
      openQualityIssues,
      pendingDispatchOrders,
      auditLogCount,
    ] = await Promise.all([
      db.user.count({ where: { isActive: true } }),
      db.employee.count({ where: { status: "ACTIVE" } }),
      db.branch.count({ where: { isActive: true } }),
      db.department.count({ where: { isActive: true } }),
      db.role.count({ where: { isActive: true } }),
      db.approvalRequest.count({ where: { status: "PENDING" } }),
      db.warehouse.count({ where: { isActive: true } }),
      db.stockBalance.count({ where: { quantity: { lte: 0 } } }),
      db.vehicle.count({ where: { isActive: true } }),
      db.driver.count({ where: { status: "ACTIVE" } }),
      db.tripOrder.count({ where: { status: { in: ["PLANNED", "DISPATCHED", "IN_TRANSIT"] } } }),
      db.vehicleIncident.count({ where: { status: { notIn: ["CLOSED", "RESOLVED"] } } }),
      db.fuelTank.count({ where: { isActive: true } }),
      db.workOrder.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      db.purchaseRequest.count({ where: { status: { in: ["DRAFT", "SUBMITTED", "PENDING"] } } }),
      db.purchaseOrder.count({ where: { status: { notIn: ["RECEIVED", "CANCELLED", "CLOSED"] } } }),
      db.productionBatch.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } }),
      db.nonConformance.count({ where: { status: { notIn: ["CLOSED", "RESOLVED"] } } }),
      db.dispatchOrder.count({ where: { status: { in: ["DRAFT", "CONFIRMED", "DISPATCHED"] } } }),
      db.auditLog.count(),
    ]);

    return success({
      userCount,
      employeeCount,
      branchCount,
      departmentCount,
      roleCount,
      pendingApprovals,
      warehouseCount,
      lowStockItems,
      activeVehicles,
      activeDrivers,
      activeTrips,
      openIncidents,
      activeFuelTanks,
      openWorkOrders,
      pendingPurchaseRequests,
      openPurchaseOrders,
      activeProductionBatches,
      openQualityIssues,
      pendingDispatchOrders,
      auditLogCount,
    });
  } catch (err) {
    console.error("[dashboard/stats] Failed to load dashboard stats", err);
    return serverError();
  }
}
