import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const [
    userCount,
    employeeCount,
    branchCount,
    pendingApprovals,
    vehicleCount,
    fuelTankCount,
    workOrderCount,
    productionBatchCount,
    qcTestCount,
    dispatchOrderCount,
    accountCount,
    warehouseItemCount,
    procurementOrderCount,
  ] = await Promise.all([
    db.user.count({ where: { isActive: true } }),
    db.employee.count({ where: { status: "ACTIVE" } }),
    db.branch.count({ where: { isActive: true } }),
    db.approvalRequest.count({ where: { status: "PENDING" } }),
    db.vehicle.count(),
    db.fuelTank.count(),
    db.workOrder.count({ where: { status: { not: "COMPLETED" } } }),
    db.productionBatch.count({ where: { status: { not: "COMPLETED" } } }),
    db.qualityTest.count(),
    db.dispatchOrder.count(),
    db.account.count(),
    db.item.count(),
    db.purchaseOrder.count(),
  ]);

  return success({
    userCount,
    employeeCount,
    branchCount,
    pendingApprovals,
    vehicleCount,
    fuelTankCount,
    workOrderCount,
    productionBatchCount,
    qcTestCount,
    dispatchOrderCount,
    accountCount,
    warehouseItemCount,
    procurementOrderCount,
  });
}
