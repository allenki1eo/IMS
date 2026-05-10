import { NextRequest } from "next/server";
import { getFinancialTrends } from "@/modules/analytics/analytics.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "analytics:financial:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "6", 10);

  try {
    const trends = await getFinancialTrends(companyId, months);
    return success(trends);
  } catch {
    return badRequest("Failed to load financial trends");
  }
}
