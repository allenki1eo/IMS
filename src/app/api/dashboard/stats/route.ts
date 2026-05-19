import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "users:user:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const [
      userCount,
      employeeCount,
      branchCount,
      departmentCount,
      itemCount,
      stockPositions,
      activeVehicles,
      activeTrips,
      openWorkOrders,
      fuelTanks,
      purchaseRequests,
      purchaseOrders,
      productionBatches,
      pendingQualityTests,
      openNonConformances,
      dispatchOrders,
      accountCount,
      bankAccountCount,
      pendingApprovals,
      pendingPaymentsCount,
    ] = await Promise.all([
      db.user.count({ where: { isActive: true } as any }),
      db.employee.count({ where: { companyId } as any }),
      db.branch.count({ where: { companyId, isActive: true } as any }),
      db.department.count({ where: { companyId, isActive: true } as any }),
      db.item.count({ where: { companyId, isActive: true } as any }),
      db.stockBalance.count({ where: { quantity: { gt: 0 } } as any }),
      db.vehicle.count({ where: { companyId, status: { not: "DECOMMISSIONED" } } as any }),
      db.tripOrder.count({ where: { companyId, status: { in: ["PLANNED", "DISPATCHED"] } } as any }),
      db.workOrder.count({ where: { companyId, status: { in: ["OPEN", "IN_PROGRESS"] } } as any }),
      db.fuelTank.count({ where: { companyId, isActive: true } as any }),
      db.purchaseRequest.count({ where: { companyId, status: { in: ["SUBMITTED", "APPROVED"] } } as any }),
      db.purchaseOrder.count({ where: { companyId, status: { not: "CANCELLED" } } as any }),
      db.productionBatch.count({ where: { companyId, status: { in: ["PLANNED", "IN_PROGRESS"] } } as any }),
      db.qualityTest.count({ where: { companyId, status: { in: ["PENDING", "IN_PROGRESS"] } } as any }),
      db.nonConformance.count({ where: { companyId, status: { not: "CLOSED" } } as any }),
      db.dispatchOrder.count({ where: { companyId, status: { in: ["CONFIRMED", "DISPATCHED"] } } as any }),
      db.account.count({ where: { companyId, isActive: true } as any }),
      db.bankAccount.count({ where: { companyId, isActive: true } as any }),
      db.approvalRequest.count({ where: { companyId, status: "PENDING" } as any }),
      db.payment.count({ where: { companyId, status: "PENDING" } as any }),
    ]);

    return success({
      userCount,
      employeeCount,
      branchCount,
      departmentCount,
      itemCount,
      stockPositions,
      activeVehicles,
      activeTrips,
      openWorkOrders,
      fuelTanks,
      purchaseRequests,
      purchaseOrders,
      productionBatches,
      pendingQualityTests,
      openNonConformances,
      dispatchOrders,
      accountCount,
      bankAccountCount,
      pendingApprovals,
      pendingPayments: pendingPaymentsCount,
    });
  } catch (err) {
    console.error("[Dashboard Stats Error]", err);
    return success({
      userCount: 0, employeeCount: 0, branchCount: 0, departmentCount: 0,
      itemCount: 0, stockPositions: 0, activeVehicles: 0, activeTrips: 0,
      openWorkOrders: 0, fuelTanks: 0, purchaseRequests: 0, purchaseOrders: 0,
      productionBatches: 0, pendingQualityTests: 0, openNonConformances: 0,
      dispatchOrders: 0, accountCount: 0, bankAccountCount: 0,
      pendingApprovals: 0, pendingPayments: 0,
    });
  }
}
