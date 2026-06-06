import { NextRequest } from "next/server";
import { getCompanyExpenseSummary } from "@/modules/finance/cashbook.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get("date");
  const date = dateStr ? new Date(dateStr) : new Date();

  try {
    const summary = await getCompanyExpenseSummary(companyId, date);
    return success(summary);
  } catch (err) {
    return handleError(err);
  }
}
