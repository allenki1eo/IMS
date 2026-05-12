import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success, serverError } from "@/lib/response";
import { hasPermission } from "@/lib/permissions";
import { db } from "@/lib/db";
import type { AuthUser } from "@/types/auth";

function canRead(user: AuthUser, permission: string) {
  return hasPermission(user, permission);
}

async function countIf(
  user: AuthUser,
  permission: string,
  count: () => Promise<number>,
) {
  if (!canRead(user, permission)) return 0;
  return count();
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;

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
      countIf(user, "users:user:read", () =>
        db.user.count({ where: { isActive: true } }),
      ),
      countIf(user, "employees:employee:read", () =>
        db.employee.count({ where: { status: "ACTIVE" } }),
      ),
      countIf(user, "company:branch:read", () =>
        db.branch.count({ where: { isActive: true } }),
      ),
      countIf(user, "company:department:read", () =>
        db.department.count({ where: { isActive: true } }),
      ),
      countIf(user, "roles:role:read", () =>
        db.role.count({ where: { isActive: true } }),
      ),
      countIf(user, "approvals:request:read", () =>
        db.approvalRequest.count({ where: { status: "PENDING" } }),
      ),
      countIf(user, "warehouse:warehouse:read", () =>
        db.warehouse.count({ where: { isActive: true } }),
      ),
      countIf(user, "warehouse:stock:read", () =>
        db.stockBalance.count({ where: { quantity: { lte: 0 } } }),
      ),
      countIf(user, "transport:vehicle:read", () =>
        db.vehicle.count({ where: { isActive: true } }),
      ),
      countIf(user, "transport:driver:read", () =>
        db.driver.count({ where: { status: "ACTIVE" } }),
      ),
      countIf(user, "transport:trip:read", () =>
        db.tripOrder.count({
          where: { status: { in: ["PLANNED", "DISPATCHED", "IN_TRANSIT"] } },
        }),
      ),
      countIf(user, "transport:incident:read", () =>
        db.vehicleIncident.count({
          where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
        }),
      ),
      countIf(user, "fuel:tank:read", () =>
        db.fuelTank.count({ where: { isActive: true } }),
      ),
      countIf(user, "maintenance:workorder:read", () =>
        db.workOrder.count({
          where: { status: { notIn: ["COMPLETED", "CANCELLED"] } },
        }),
      ),
      countIf(user, "procurement:request:read", () =>
        db.purchaseRequest.count({
          where: { status: { in: ["DRAFT", "SUBMITTED", "PENDING"] } },
        }),
      ),
      countIf(user, "procurement:order:read", () =>
        db.purchaseOrder.count({
          where: { status: { notIn: ["RECEIVED", "CANCELLED", "CLOSED"] } },
        }),
      ),
      countIf(user, "production:batch:read", () =>
        db.productionBatch.count({
          where: { status: { in: ["PLANNED", "IN_PROGRESS"] } },
        }),
      ),
      countIf(user, "qc:ncr:read", () =>
        db.nonConformance.count({
          where: { status: { notIn: ["CLOSED", "RESOLVED"] } },
        }),
      ),
      countIf(user, "dispatch:order:read", () =>
        db.dispatchOrder.count({
          where: { status: { in: ["DRAFT", "CONFIRMED", "DISPATCHED"] } },
        }),
      ),
      countIf(user, "audit:log:read", () => db.auditLog.count()),
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
