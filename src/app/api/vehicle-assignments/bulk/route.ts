import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:assignment:update");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { ids, action } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");
  if (action !== "return" && action !== "cancel") return badRequest("Invalid action");

  try {
    if (action === "return") {
      const updated = await db.vehicleAssignment.updateMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        data: { status: "RETURNED", returnedAt: new Date() },
      });

      // Fetch the returned assignments to update drivers and vehicles
      const assignments = await db.vehicleAssignment.findMany({
        where: { id: { in: ids }, status: "RETURNED" },
        select: { driverId: true, vehicleId: true },
      });

      const driverIds = assignments.map((a) => a.driverId).filter(Boolean) as string[];
      const vehicleIds = assignments.map((a) => a.vehicleId).filter(Boolean) as string[];

      await Promise.all([
        driverIds.length > 0
          ? db.driver.updateMany({ where: { id: { in: driverIds } }, data: { isAvailable: true } })
          : Promise.resolve(),
        vehicleIds.length > 0
          ? db.vehicle.updateMany({ where: { id: { in: vehicleIds } }, data: { status: "ACTIVE" } })
          : Promise.resolve(),
      ]);

      return success({ updated: updated.count });
    } else {
      const updated = await db.vehicleAssignment.updateMany({
        where: { id: { in: ids }, status: "ACTIVE" },
        data: { status: "CANCELLED" },
      });
      return success({ updated: updated.count });
    }
  } catch (err) {
    return handleError(err);
  }
}
