import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { bulkCreateBales } from "@/modules/cotton/cotton.service";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:bale:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { bales } = body;
  if (!Array.isArray(bales) || bales.length === 0) return badRequest("bales array is required");

  try {
    const result = await bulkCreateBales(companyId, bales, auth.user.id);
    return success(result);
  } catch (err) {
    return handleError(err);
  }
}
