import { NextRequest } from "next/server";
import { getItemById, updateItem } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:item:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return notFound("Item not found");
  if (item.companyId !== companyId) return notFound("Item not found");
  return success(item);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:item:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { code, name, description, categoryId, uomId, itemType, minStock, maxStock, reorderPoint, projectedWeeklyUsage, leadTimeWeeks, confirmationNote } = body;

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateItem({
      id,
      data: {
        ...(code !== undefined ? { code } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(categoryId !== undefined ? { categoryId } : {}),
        ...(uomId !== undefined ? { uomId } : {}),
        ...(itemType !== undefined ? { itemType } : {}),
        ...(minStock !== undefined ? { minStock } : {}),
        ...(maxStock !== undefined ? { maxStock } : {}),
        ...(reorderPoint !== undefined ? { reorderPoint } : {}),
        ...(projectedWeeklyUsage !== undefined ? { projectedWeeklyUsage } : {}),
        ...(leadTimeWeeks !== undefined ? { leadTimeWeeks } : {}),
        ...(confirmationNote !== undefined ? { confirmationNote } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Item not found") return notFound(msg);
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:item:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const item = await getItemById(id);
  if (!item) return notFound("Item not found");
  if (item.companyId !== companyId) return notFound("Item not found");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await db.item.delete({ where: { id } });
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "ITEM_DELETE",
      module: "warehouse",
      resource: "item",
      recordId: id,
      description: `Deleted item record`,
      ipAddress,
      userAgent,
      companyId,
    });
    return success({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
