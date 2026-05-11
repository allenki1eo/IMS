import { NextRequest } from "next/server";
import { getExecutiveKPIs } from "@/modules/analytics/analytics.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "analytics:dashboard:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const kpis = await getExecutiveKPIs(companyId);
    return success(kpis);
  } catch {
    return badRequest("Failed to load KPIs");
  }
}
