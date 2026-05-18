import { NextRequest } from "next/server";
import { completeTrip } from "@/modules/transport/trips.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { actualArrival, odometer, notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const trip = await completeTrip({
      id,
      actualArrival: actualArrival ? new Date(actualArrival) : null,
      odometer: odometer ?? null,
      notes: notes ?? null,
      completedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(trip);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return notFound(msg);
    if (msg === "Only DISPATCHED trips can be completed") return badRequest(msg);
    return handleError(err);
  }
}
