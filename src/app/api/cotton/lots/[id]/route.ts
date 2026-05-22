import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { getLot } from "@/modules/cotton/cotton.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:lot:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;

  try {
    const lot = await getLot(companyId, id);
    if (!lot) return notFound("Lot not found");
    return success(lot);
  } catch (err) {
    return handleError(err);
  }
}
