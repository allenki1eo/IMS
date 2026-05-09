import { NextRequest } from "next/server";
import { listAdjustments, createAdjustment } from "@/modules/warehouse/adjustments.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:adjustment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const warehouseId = searchParams.get("warehouseId") ?? undefined;

  const { adjustments, total } = await listAdjustments(companyId, {
    search,
    status,
    warehouseId,
    page: paginationParams.page,
    pageSize: paginationParams.pageSize,
  });

  return paginated(adjustments, buildMeta(total, paginationParams));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:adjustment:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { warehouseId, reason, notes, lines } = body;

  if (!warehouseId || typeof warehouseId !== "string")
    return badRequest("warehouseId is required");
  if (!reason || typeof reason !== "string") return badRequest("reason is required");
  if (!Array.isArray(lines) || lines.length === 0)
    return badRequest("lines must be a non-empty array");

  for (const line of lines) {
    if (!line.itemId) return badRequest("Each line must have an itemId");
    if (typeof line.countedQty !== "number" || line.countedQty < 0)
      return badRequest("Each line must have a non-negative countedQty");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const adjustment = await createAdjustment({
      companyId,
      warehouseId,
      reason,
      notes: notes ?? null,
      lines,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(adjustment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return serverError(msg);
  }
}
