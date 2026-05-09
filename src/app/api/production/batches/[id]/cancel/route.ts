import { NextRequest } from "next/server";
import { cancelProductionBatch } from "@/modules/production/batches.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");
  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);
  try {
    const updated = await cancelProductionBatch(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found")) return notFound(msg);
    if (msg.includes("open")) return badRequest(msg);
    return serverError();
  }
}

