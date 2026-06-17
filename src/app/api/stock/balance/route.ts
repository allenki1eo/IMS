import { NextRequest } from "next/server";
import { getStockBalance } from "@/modules/warehouse/stock.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const itemId = searchParams.get("itemId") ?? undefined;
  const lowStockParam = searchParams.get("lowStock");
  const lowStock = lowStockParam === "true" ? true : undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "100", 10), 500);

  try {
    const result = await getStockBalance(companyId, {
      warehouseId,
      itemId,
      lowStock,
      page,
      limit,
    });
    return NextResponse.json({
      success: true,
      data: result.items,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.limit,
        totalPages: result.totalPages,
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
