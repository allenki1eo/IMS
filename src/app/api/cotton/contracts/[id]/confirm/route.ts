import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { confirmContract } from "@/modules/cotton/cotton.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:contract:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;

  try {
    const contract = await confirmContract(companyId, id, auth.user.id);
    return success(contract);
  } catch (err) {
    return handleError(err);
  }
}
