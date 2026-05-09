import { NextRequest } from "next/server";
import { getStockBalance } from "@/modules/warehouse/stock.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
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
    return success({ data: balances, meta: { total: balances.length } });
  } catch {
    return serverError();
  }
}
