import { NextRequest } from "next/server";
import { getBalanceSheet } from "@/modules/finance/financial-reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const asOfDate = searchParams.get("asOfDate") || undefined;

  try {
    const report = await getBalanceSheet(companyId, asOfDate || undefined);
    return success(report);
  } catch (err) {
    if (err instanceof Error && err.message.includes("date")) {
      return badRequest(err.message);
    }
    return badRequest("Failed to generate balance sheet");
  }
}
