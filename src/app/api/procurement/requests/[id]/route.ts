import { NextRequest } from "next/server";
import { getPurchaseRequest } from "@/modules/procurement/requests.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:request:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const purchaseRequest = await getPurchaseRequest(companyId, id);
  if (!purchaseRequest) return notFound("Purchase request not found");
  return success(purchaseRequest);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:request:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.purchaseRequest.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Purchase request not found");

    await db.purchaseRequest.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "PURCHASE_REQUEST_DELETE",
      module: "procurement",
      resource: "request",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted purchase request: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}

