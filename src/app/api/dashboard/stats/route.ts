import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { requireAuth } from "@/lib/api-helpers";
import { success } from "@/lib/response";
import { db } from "@/lib/db";

async function countOrZero(query: () => Promise<number>) {
  try {
    return await query();
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2021"
    ) {
      return 0;
    }
    throw error;
  }
}

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const [
    userCount,
    employeeCount,
    branchCount,
    departmentCount,
    pendingApprovals,
    itemCount,
    stockPositions,
    activeVehicles,
    activeTrips,
    openWorkOrders,
    purchaseRequests,
    purchaseOrders,
    productionBatches,
    pendingQualityTests,
    openNonConformances,
    dispatchOrders,
    fuelTanks,
    accountCount,
    bankAccountCount,
    pendingPayments,
  ] = await Promise.all([
    countOrZero(() => db.user.count({ where: { isActive: true } })),
    countOrZero(() => db.employee.count({ where: { status: "ACTIVE" } })),
    countOrZero(() => db.branch.count({ where: { isActive: true } })),
    countOrZero(() => db.department.count({ where: { isActive: true } })),
    countOrZero(() => db.approvalRequest.count({ where: { status: "PENDING" } })),
    countOrZero(() => db.item.count({ where: { isActive: true } })),
    countOrZero(() => db.stockBalance.count({ where: { quantity: { gt: 0 } } })),
    countOrZero(() => db.vehicle.count({ where: { isActive: true } })),
    countOrZero(() => db.tripOrder.count({ where: { status: { in: ["PLANNED", "DISPATCHED", "IN_TRANSIT"] } } })),
    countOrZero(() => db.workOrder.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })),
    countOrZero(() => db.purchaseRequest.count({ where: { status: { in: ["SUBMITTED", "APPROVED"] } } })),
    countOrZero(() => db.purchaseOrder.count({ where: { status: { in: ["SENT", "PARTIAL"] } } })),
    countOrZero(() => db.productionBatch.count({ where: { status: { in: ["PLANNED", "IN_PROGRESS"] } } })),
    countOrZero(() => db.qualityTest.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } })),
    countOrZero(() => db.nonConformance.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } })),
    countOrZero(() => db.dispatchOrder.count({ where: { status: { in: ["CONFIRMED", "DISPATCHED"] } } })),
    countOrZero(() => db.fuelTank.count({ where: { isActive: true } })),
    countOrZero(() => db.account.count({ where: { isActive: true } })),
    countOrZero(() => db.bankAccount.count({ where: { isActive: true } })),
    countOrZero(() => db.payment.count({ where: { status: "PENDING" } })),
  ]);

  return success({
    userCount,
    employeeCount,
    branchCount,
    departmentCount,
    pendingApprovals,
    itemCount,
    stockPositions,
    activeVehicles,
    activeTrips,
    openWorkOrders,
    purchaseRequests,
    purchaseOrders,
    productionBatches,
    pendingQualityTests,
    openNonConformances,
    dispatchOrders,
    fuelTanks,
    accountCount,
    bankAccountCount,
    pendingPayments,
  });
}
