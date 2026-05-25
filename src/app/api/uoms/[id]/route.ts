import { NextRequest } from "next/server";
import { updateUOM } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, notFound, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:uom:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, code, symbol, isBase, isActive } = body;

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateUOM({
      id,
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(symbol !== undefined ? { symbol } : {}),
        ...(isBase !== undefined ? { isBase } : {}),
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
    if (msg === "UOM not found") return notFound(msg);
    return handleError(err);
  }
}
