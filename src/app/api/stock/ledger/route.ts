import { NextRequest } from "next/server";
import { getStockLedger } from "@/modules/warehouse/stock.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, badRequest, serverError, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const itemId = searchParams.get("itemId") ?? undefined;
  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const referenceType = searchParams.get("referenceType") ?? undefined;

  try {
    const { entries, total } = await getStockLedger(companyId, {
      itemId,
      warehouseId,
      referenceType,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
    });

    return paginated(entries, buildMeta(total, paginationParams));
  } catch (err) {
    return handleError(err);
  }
}
