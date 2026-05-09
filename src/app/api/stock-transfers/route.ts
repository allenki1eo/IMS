import { NextRequest } from "next/server";
import { listTransfers, createTransfer } from "@/modules/warehouse/transfers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:transfer:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { transfers, total } = await listTransfers(companyId, {
    search,
    status,
    page: paginationParams.page,
    pageSize: paginationParams.pageSize,
  });

  return paginated(transfers, buildMeta(total, paginationParams));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:transfer:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { fromWarehouseId, toWarehouseId, notes, lines } = body;

  if (!fromWarehouseId || typeof fromWarehouseId !== "string")
    return badRequest("fromWarehouseId is required");
  if (!toWarehouseId || typeof toWarehouseId !== "string")
    return badRequest("toWarehouseId is required");
  if (fromWarehouseId === toWarehouseId)
    return badRequest("Source and destination warehouses must be different");
  if (!Array.isArray(lines) || lines.length === 0)
    return badRequest("lines must be a non-empty array");

  for (const line of lines) {
    if (!line.itemId) return badRequest("Each line must have an itemId");
    if (typeof line.quantity !== "number" || line.quantity <= 0)
      return badRequest("Each line must have a positive quantity");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const transfer = await createTransfer({
      companyId,
      fromWarehouseId,
      toWarehouseId,
      notes: notes ?? null,
      lines,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(transfer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Insufficient stock")) return badRequest(msg);
    return serverError();
  }
}
