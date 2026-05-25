import { NextRequest } from "next/server";
import { getCategoryStockSummary } from "@/modules/warehouse/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const categories = await getCategoryStockSummary(companyId);
    return success(categories);
  } catch (err) {
    return handleError(err);
  }
}
