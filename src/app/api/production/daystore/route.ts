import { NextRequest } from "next/server";
import { getDaystorePlan } from "@/modules/production/daystore.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest , handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "production:batch:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const date = dateParam ? new Date(dateParam) : new Date();

  if (isNaN(date.getTime())) {
    return badRequest("Invalid date");
  }

  try {
    const plan = await getDaystorePlan(companyId, date);
    return success(plan);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
