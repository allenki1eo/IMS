import { NextRequest } from "next/server";
import { submitPurchaseRequest } from "@/modules/procurement/requests.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:request:submit");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);
  try {
    const updated = await submitPurchaseRequest(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Purchase request not found") return notFound(msg);
    if (msg.includes("DRAFT")) return badRequest(msg);
    return handleError(err);
  }
}

