import { NextRequest } from "next/server";
import { getIncomeStatement } from "@/modules/finance/financial-reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");

  if (!fromDate || !toDate) {
    return badRequest("fromDate and toDate are required");
  }

  try {
    const report = await getIncomeStatement(companyId, { fromDate, toDate });
    return success(report);
  } catch (err) {
    if (err instanceof Error && (err.message.includes("date") || err.message.includes("before"))) {
      return badRequest(err.message);
    }
    return badRequest("Failed to generate income statement");
  }
}
