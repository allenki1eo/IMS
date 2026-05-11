import { NextRequest } from "next/server";
import { listGRNs, createGRN } from "@/modules/warehouse/grn.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:grn:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { grns, total } = await listGRNs(companyId, {
    search,
    warehouseId,
    status,
    page: paginationParams.page,
    pageSize: paginationParams.pageSize,
  });

  return paginated(grns, buildMeta(total, paginationParams));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:grn:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { warehouseId, supplierName, supplierRef, notes, lines } = body;

  if (!warehouseId || typeof warehouseId !== "string") return badRequest("warehouseId is required");
  if (!Array.isArray(lines) || lines.length === 0) return badRequest("lines must be a non-empty array");

  for (const line of lines) {
    if (!line.itemId) return badRequest("Each line must have an itemId");
    if (typeof line.quantity !== "number" || line.quantity <= 0)
      return badRequest("Each line must have a positive quantity");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const grn = await createGRN({
      companyId,
      warehouseId,
      supplierName: supplierName ?? null,
      supplierRef: supplierRef ?? null,
      notes: notes ?? null,
      lines,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(grn);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return serverError(msg);
  }
}
