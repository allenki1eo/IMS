import { NextRequest } from "next/server";
import { updateLocation } from "@/modules/warehouse/warehouse.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, notFound, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; locationId: string }> }
) {
  const auth = await requirePermission(request, "warehouse:location:update");
  if ("error" in auth) return auth.error;

  const { locationId } = await params;
  const body = await request.json();
  const { name, code, parentId, locationType, capacity, isActive } = body;

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateLocation({
      id: locationId,
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
        ...(locationType !== undefined ? { locationType } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Location not found") return notFound(msg);
    return handleError(err);
  }
}
