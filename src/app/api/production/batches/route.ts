import { NextRequest } from "next/server";
import { listProductionBatches, createProductionBatch } from "@/modules/production/batches.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

type MaterialBody = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  plannedQty: number | string;
  issuedQty?: number | string;
  uom?: string;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "production:batch:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  try {
    const { data, meta } = await listProductionBatches(companyId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      lineId: searchParams.get("lineId") ?? undefined,
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
  const auth = await requirePermission(request, "production:batch:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);
  try {
    const batch = await createProductionBatch(
      companyId,
      {
        lineId: body.lineId ?? null,
        recipeId: body.recipeId ?? null,
        batchType: body.batchType ?? "BREWING",
        productItemId: body.productItemId ?? null,
        productCode: body.productCode ?? null,
        productName: body.productName ?? null,
        plannedQty: body.plannedQty == null || body.plannedQty === "" ? null : Number(body.plannedQty),
        uom: body.uom ?? "L",
        plannedStart: body.plannedStart ?? null,
        plannedEnd: body.plannedEnd ?? null,
        notes: body.notes ?? null,
        materials: Array.isArray(body.materials)
          ? body.materials.map((line: MaterialBody) => ({
              itemId: line.itemId ?? null,
              itemCode: line.itemCode ?? null,
              description: line.description,
              plannedQty: Number(line.plannedQty),
              issuedQty: line.issuedQty == null || line.issuedQty === "" ? 0 : Number(line.issuedQty),
              uom: line.uom ?? "KG",
            }))
          : [],
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(batch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("not found") || msg.includes("inactive") || msg.includes("required") || msg.includes("greater")) return badRequest(msg);
    return handleError(err);
  }
}

