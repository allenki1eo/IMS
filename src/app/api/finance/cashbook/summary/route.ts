import { NextRequest } from "next/server";
import { getDailySummary } from "@/modules/finance/cashbook.service";
import { requirePermission, getCompanyId, getUser } from "@/lib/api-helpers";
import { hasPermission } from "@/lib/permissions";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();

  // Support optional companyId for director drill-down
  const requestedCompanyId = searchParams.get("companyId");
  let companyId: string | null = null;

  if (requestedCompanyId) {
    // Only allow if user has director permission
    const canViewOtherCompany = hasPermission(auth.user, "finance:cashbook:director");
    if (canViewOtherCompany) {
      companyId = requestedCompanyId;
    } else {
      companyId = await getCompanyId(request);
    }
  } else {
    companyId = await getCompanyId(request);
  }

  if (!companyId) return badRequest("Company not configured");

  try {
    const summary = await getDailySummary(companyId, date);
    return success(summary);
  } catch (err) {
    return handleError(err);
  }
}
