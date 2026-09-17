import { NextRequest } from "next/server";
import { listLots, receiveLot } from "@/modules/dispatch/inventory.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:lot:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const productId = searchParams.get("productId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const qaStatus = searchParams.get("qaStatus") ?? undefined;

  try {
    const { data, meta } = await listLots(companyId, {
      productId,
      status,
      qaStatus,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:lot:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    productId,
    lotNumber,
    quantityIn,
    unitCost,
    bestBefore,
    warehouseId,
    productionBatchId,
    abvPct,
    notes,
  } = body;

  if (!productId || typeof productId !== "string") return badRequest("productId is required");
  if (!lotNumber || typeof lotNumber !== "string" || !lotNumber.trim())
    return badRequest("lotNumber is required");
  if (!warehouseId || typeof warehouseId !== "string") return badRequest("warehouseId is required");
  if (!quantityIn || typeof quantityIn !== "number" || quantityIn <= 0)
    return badRequest("quantityIn must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const lot = await receiveLot(
      companyId,
      {
        productId,
        lotNumber,
        quantityIn,
        unitCost: unitCost ?? null,
        bestBefore: bestBefore ?? null,
        warehouseId,
        productionBatchId: productionBatchId ?? null,
        abvPct: abvPct ?? null,
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
      msg.includes("required") ||
      msg.includes("not found") ||
      msg.includes("inactive") ||
      msg.includes("must be") ||
      msg.includes("cannot be") ||
      msg.includes("invalid")
    )
      return badRequest(msg);
    return handleError(err);
  }
}
