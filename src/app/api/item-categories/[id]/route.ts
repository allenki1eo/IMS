import { NextRequest } from "next/server";
import { updateCategory } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, notFound, serverError, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:category:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, code, description, parentId, isActive } = body;

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateCategory({
      id,
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(parentId !== undefined ? { parentId } : {}),
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
    if (msg === "Category not found") return notFound(msg);
    return handleError(err);
  }
}
