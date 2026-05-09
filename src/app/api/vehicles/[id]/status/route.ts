import { NextRequest } from "next/server";
import { setVehicleStatus } from "@/modules/transport/vehicles.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

const VALID_STATUSES = ["ACTIVE", "INACTIVE", "IN_REPAIR", "RETIRED"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!status || typeof status !== "string") return badRequest("status is required");
  if (!VALID_STATUSES.includes(status)) {
    return badRequest(`status must be one of: ${VALID_STATUSES.join(", ")}`);
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await setVehicleStatus({
      id,
      status,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found") return notFound(msg);
    return serverError();
  }
}
