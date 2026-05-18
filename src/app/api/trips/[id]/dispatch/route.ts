import { NextRequest } from "next/server";
import { dispatchTrip } from "@/modules/transport/trips.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { actualDeparture, odometer } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const trip = await dispatchTrip({
      id,
      actualDeparture: actualDeparture ? new Date(actualDeparture) : null,
      odometer: odometer ?? null,
      dispatchedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(trip);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return notFound(msg);
    if (msg === "Only PLANNED trips can be dispatched") return badRequest(msg);
    return handleError(err);
  }
}
