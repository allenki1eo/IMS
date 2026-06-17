import { NextRequest } from "next/server";
import { getDirectorSummary, getDirectorDailySummary } from "@/modules/finance/cashbook.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:director");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  try {
    // Single-date daily mode
    if (dateParam) {
      const date = new Date(dateParam);
      const data = await getDirectorDailySummary(date);
      return success({ mode: "daily", ...data });
    }

    // Period summary mode (existing behavior)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : startOfMonth;
    const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : now;

    const summary = await getDirectorSummary(dateFrom, dateTo);
    return success(summary);
  } catch (err) {
    return handleError(err);
  }
}
