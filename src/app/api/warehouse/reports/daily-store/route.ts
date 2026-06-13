import { NextRequest } from "next/server";
import { getDailyStoreReport } from "@/modules/warehouse/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");
  const warehouseId = searchParams.get("warehouseId") ?? undefined;

  const date = dateParam ? new Date(dateParam) : new Date();
  if (isNaN(date.getTime())) return badRequest("Invalid date");

  try {
    const report = await getDailyStoreReport({ companyId, date, warehouseId });
    return success(report);
  } catch (err) {
    return handleError(err);
  }
}
