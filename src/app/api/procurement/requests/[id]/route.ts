import { NextRequest } from "next/server";
import { getPurchaseRequest } from "@/modules/procurement/requests.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

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

