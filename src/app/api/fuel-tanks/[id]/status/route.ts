import { NextRequest } from "next/server";
import { setTankStatus } from "@/modules/fuel/tanks.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:tank:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") return badRequest("isActive must be a boolean");

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await setTankStatus({
      id,
      isActive,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel tank not found") return notFound(msg);
    return serverError();
  }
}
