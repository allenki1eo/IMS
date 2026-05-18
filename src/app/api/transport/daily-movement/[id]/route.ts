import { NextRequest } from "next/server";
import { getDailyMovementById, updateDailyMovement } from "@/modules/transport/daily-movement.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, notFound, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "transport:daily-movement:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;

  try {
    const report = await getDailyMovementById(id);
    if (!report) return notFound("Report not found");
    return success(report);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "transport:daily-movement:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { entries, notes } = body;

  if (!Array.isArray(entries)) return badRequest("entries must be an array");

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateDailyMovement({
      id,
      entries: entries.map((e: {
        vehicleId: string;
        driverId?: string | null;
        vehicleStatus: string;
        tripId?: string | null;
        destination?: string | null;
        departureTime?: string | null;
        expectedReturn?: string | null;
        odometerOut?: number | null;
        fuelLevel?: string | null;
        remarks?: string | null;
      }) => ({
        vehicleId: e.vehicleId,
        driverId: e.driverId ?? null,
        vehicleStatus: e.vehicleStatus ?? "PRESENT",
        tripId: e.tripId ?? null,
        destination: e.destination ?? null,
        departureTime: e.departureTime ? new Date(e.departureTime) : null,
        expectedReturn: e.expectedReturn ? new Date(e.expectedReturn) : null,
        odometerOut: e.odometerOut ?? null,
        fuelLevel: e.fuelLevel ?? null,
        remarks: e.remarks ?? null,
      })),
      notes: notes ?? null,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "Report not found" || err.message === "Only DRAFT reports can be updated")) {
      return badRequest(err.message);
    }
    console.error("[API Error]", err);
    return handleError(err);
  }
}
