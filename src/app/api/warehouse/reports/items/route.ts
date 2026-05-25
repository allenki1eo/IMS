import { NextRequest } from "next/server";
import { getItemsStockSummary } from "@/modules/warehouse/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const categoryId = searchParams.get("categoryId") ?? undefined;

  try {
    const items = await getItemsStockSummary(companyId, categoryId);
    return success(items);
  } catch (err) {
    return handleError(err);
  }
}
