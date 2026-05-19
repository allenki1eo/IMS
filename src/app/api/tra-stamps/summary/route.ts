import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { getStampSummary } from "@/modules/tra-stamps/tra-stamps.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "tra:stamp:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const summary = await getStampSummary(companyId);
    return success(summary);
  } catch (err) {
    return handleError(err);
  }
}
