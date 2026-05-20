import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:assignment:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ids, action } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");
  if (action !== "return" && action !== "cancel") return badRequest("Invalid action");

  try {
    // Fetch ACTIVE assignments first so we know which drivers/vehicles to free
    const active = await db.vehicleAssignment.findMany({
      where: { id: { in: ids }, status: "ACTIVE" },
      select: { id: true, driverId: true, vehicleId: true },
    });

    if (active.length === 0) return success({ updated: 0 });

    const activeIds = active.map((a) => a.id);
    const driverIds = active.map((a) => a.driverId).filter(Boolean) as string[];
    const vehicleIds = active.map((a) => a.vehicleId).filter(Boolean) as string[];

    // Update assignment status
    await db.vehicleAssignment.updateMany({
      where: { id: { in: activeIds } },
      data: action === "return"
        ? { status: "RETURNED", returnedAt: new Date() }
        : { status: "CANCELLED" },
    });

    // Free drivers and vehicles regardless of return or cancel
    await Promise.all([
      driverIds.length > 0
        ? db.driver.updateMany({ where: { id: { in: driverIds } }, data: { isAvailable: true } })
        : Promise.resolve(),
      vehicleIds.length > 0
        ? db.vehicle.updateMany({ where: { id: { in: vehicleIds } }, data: { status: "ACTIVE" } })
        : Promise.resolve(),
    ]);

    return success({ updated: active.length });
  } catch (err) {
    return handleError(err);
  }
}
