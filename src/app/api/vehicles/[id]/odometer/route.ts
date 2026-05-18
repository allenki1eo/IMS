import { NextRequest } from "next/server";
import { updateOdometer } from "@/modules/transport/vehicles.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { odometer } = body;

  if (odometer === undefined || odometer === null || typeof odometer !== "number") {
    return badRequest("odometer is required and must be a number");
  }
  if (odometer < 0) return badRequest("odometer must be a non-negative number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateOdometer({
      id,
      odometer,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found") return notFound(msg);
    return handleError(err);
  }
}
