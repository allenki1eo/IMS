import { NextRequest } from "next/server";
import { setItemStatus } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:item:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { isActive } = body;

  if (typeof isActive !== "boolean") return badRequest("isActive must be a boolean");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await setItemStatus({
      id,
      isActive,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ id, isActive });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Item not found") return notFound(msg);
    return handleError(err);
  }
}
