import { NextRequest } from "next/server";
import { cancelTrip } from "@/modules/transport/trips.service";
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
  const { reason } = body;

  if (!reason || typeof reason !== "string") return badRequest("reason is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const trip = await cancelTrip({
      id,
      reason,
      cancelledById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(trip);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return notFound(msg);
    if (msg === "Only PLANNED trips can be cancelled") return badRequest(msg);
    return handleError(err);
  }
}
