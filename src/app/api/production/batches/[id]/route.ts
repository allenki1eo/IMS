import { NextRequest } from "next/server";
import { deleteProductionBatch, getProductionBatch } from "@/modules/production/batches.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const batch = await getProductionBatch(companyId, id);
  if (!batch) return notFound("Production batch not found");
  return success(batch);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    await deleteProductionBatch(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found")) return notFound(msg);
    if (msg.includes("cannot be deleted")) return badRequest(msg);
    return handleError(err);
  }
}

