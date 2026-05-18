import { NextRequest } from "next/server";
import { updateProductionRecipeStatus } from "@/modules/production/recipes.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:recipe:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { status } = await request.json();
  const { ipAddress } = getRequestMeta(request);
  try {
    const updated = await updateProductionRecipeStatus(companyId, id, status, auth.user.id, auth.user.fullName, ipAddress);
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found")) return notFound(msg);
    if (msg.includes("Invalid")) return badRequest(msg);
    return handleError(err);
  }
}

