import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"];

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");
  if (!VALID_STATUSES.includes(status)) return badRequest("Invalid status");

  try {
    // When taking vehicles out of service, cancel active assignments and free drivers
    if (status !== "ACTIVE") {
      const activeAssignments = await db.vehicleAssignment.findMany({
        where: { vehicleId: { in: ids }, status: "ACTIVE" },
        select: { id: true, driverId: true },
      });

      if (activeAssignments.length > 0) {
        const assignmentIds = activeAssignments.map((a) => a.id);
        const driverIds = activeAssignments.map((a) => a.driverId).filter(Boolean) as string[];

        await db.vehicleAssignment.updateMany({
          where: { id: { in: assignmentIds } },
          data: { status: "CANCELLED" },
        });

        if (driverIds.length > 0) {
          await db.driver.updateMany({
            where: { id: { in: driverIds } },
            data: { isAvailable: true },
          });
        }
      }
    }

    await db.vehicle.updateMany({
      where: { id: { in: ids }, companyId },
      data: { status },
    });

    return success({ updated: ids.length });
  } catch (err) {
    return handleError(err);
  }
}
