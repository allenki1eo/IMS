import { NextRequest } from "next/server";
import { setDriverAvailability } from "@/modules/transport/drivers.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:driver:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { isAvailable } = body;

  if (typeof isAvailable !== "boolean") {
    return badRequest("isAvailable must be a boolean");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await setDriverAvailability({
      id,
      isAvailable,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Driver not found") return notFound(msg);
    return handleError(err);
  }
}
