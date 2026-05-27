import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { getContract } from "@/modules/cotton/cotton.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:contract:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;

  try {
    const contract = await getContract(companyId, id);
    if (!contract) return notFound("Contract not found");
    return success(contract);
  } catch (err) {
    return handleError(err);
  }
}
