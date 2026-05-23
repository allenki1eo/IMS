import { NextRequest } from "next/server";
import { deleteProductionLine, getProductionLine } from "@/modules/production/lines.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:line:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const line = await getProductionLine(companyId, id);
  if (!line) return notFound("Production line not found");
  return success(line);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:line:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    await deleteProductionLine(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found")) return notFound(msg);
    if (msg.includes("cannot be deleted")) return badRequest(msg);
    return handleError(err);
  }
}

