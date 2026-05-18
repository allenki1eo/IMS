import { NextRequest } from "next/server";
import { getStockBalance } from "@/modules/warehouse/stock.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { success, badRequest, serverError, handleError } from "@/lib/response";

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

  try {
    const balances = await getStockBalance(companyId, {
      warehouseId,
      itemId,
      lowStock,
    });
    return NextResponse.json({ success: true, data: balances, meta: { total: balances.length, page: 1, pageSize: balances.length, totalPages: 1 } });
  } catch (err) {
    return handleError(err);
  }
}
