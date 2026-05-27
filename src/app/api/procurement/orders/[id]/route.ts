import { NextRequest } from "next/server";
import { getPurchaseOrder } from "@/modules/procurement/orders.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const order = await getPurchaseOrder(companyId, id);
  if (!order) return notFound("Purchase order not found");
  return success(order);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:order:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.purchaseOrder.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Purchase order not found");

    await db.purchaseOrder.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "PURCHASE_ORDER_DELETE",
      module: "procurement",
      resource: "order",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted purchase order: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}

