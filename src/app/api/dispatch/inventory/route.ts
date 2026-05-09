import { NextRequest } from "next/server";
import { listLots, receiveLot } from "@/modules/dispatch/inventory.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:lot:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const productId = searchParams.get("productId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { data, meta } = await listLots(companyId, {
    productId,
    status,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:lot:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { productId, lotNumber, quantityIn, unitCost, bestBefore, warehouseId, notes } = body;

  if (!productId || typeof productId !== "string") return badRequest("productId is required");
  if (!quantityIn || typeof quantityIn !== "number" || quantityIn <= 0)
    return badRequest("quantityIn must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const lot = await receiveLot(
      companyId,
      {
        productId,
        lotNumber: lotNumber ?? null,
        quantityIn,
        unitCost: unitCost ?? null,
        bestBefore: bestBefore ?? null,
        warehouseId: warehouseId ?? null,
        notes: notes ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(lot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg === "Product not found" ||
      msg === "Warehouse not found" ||
      msg === "Quantity must be greater than zero"
    )
      return badRequest(msg);
    return serverError();
  }
}
