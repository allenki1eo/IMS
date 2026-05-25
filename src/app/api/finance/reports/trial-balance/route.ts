import { NextRequest } from "next/server";
import { getTrialBalance } from "@/modules/finance/financial-reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const report = await getTrialBalance(companyId);
    return success(report);
  } catch {
    return badRequest("Failed to generate trial balance");
  }
}
