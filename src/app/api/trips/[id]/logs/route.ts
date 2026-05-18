import { NextRequest } from "next/server";
import { addTripLog } from "@/modules/transport/trips.service";
import { requirePermission } from "@/lib/api-helpers";
import { created, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:trip:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { eventType, location, odometer, notes } = body;

  if (!eventType || typeof eventType !== "string") return badRequest("eventType is required");

  try {
    const log = await addTripLog({
      tripId: id,
      eventType,
      location: location ?? null,
      odometer: odometer ?? null,
      notes: notes ?? null,
      recordedById: auth.user.id,
    });
    return created(log);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return notFound(msg);
    return handleError(err);
  }
}
