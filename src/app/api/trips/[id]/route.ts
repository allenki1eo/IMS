import { NextRequest } from "next/server";
import { getTripById, updateTrip } from "@/modules/transport/trips.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) return notFound("Trip not found");
  if (trip.companyId !== companyId) return notFound("Trip not found");

  return success(trip);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const {
    vehicleId,
    driverId,
    origin,
    destination,
    scheduledDeparture,
    scheduledArrival,
    cargoDescription,
    cargoWeight,
    priority,
    notes,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateTrip({
      id,
      data: {
        ...(vehicleId !== undefined ? { vehicleId } : {}),
        ...(driverId !== undefined ? { driverId } : {}),
        ...(origin !== undefined ? { origin } : {}),
        ...(destination !== undefined ? { destination } : {}),
        ...(scheduledDeparture !== undefined
          ? { scheduledDeparture: scheduledDeparture ? new Date(scheduledDeparture) : null }
          : {}),
        ...(scheduledArrival !== undefined
          ? { scheduledArrival: scheduledArrival ? new Date(scheduledArrival) : null }
          : {}),
        ...(cargoDescription !== undefined ? { cargoDescription } : {}),
        ...(cargoWeight !== undefined ? { cargoWeight } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return notFound(msg);
    if (msg === "Only PLANNED trips can be updated") return badRequest(msg);
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const trip = await getTripById(id);
  if (!trip) return notFound("Trip not found");
  if (trip.companyId !== companyId) return notFound("Trip not found");

  const { ipAddress } = getRequestMeta(request);

  try {
    await db.tripCargo.deleteMany({ where: { tripId: id } });
    await db.tripLog.deleteMany({ where: { tripId: id } });
    await db.tripOrder.delete({ where: { id } });
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "TRIP_DELETE",
      module: "transport",
      resource: "trip",
      recordId: id,
      description: `Deleted trip order`,
      ipAddress,
      companyId,
    });
    return success({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
