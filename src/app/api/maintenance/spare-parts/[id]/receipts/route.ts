import { NextRequest } from "next/server";
import { listReceipts, receiveStock } from "@/modules/maintenance/receipts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:spare_part:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: sparePartId } = await params;
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const { data, meta } = await listReceipts(companyId, {
    sparePartId,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:spare_part:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: sparePartId } = await params;
  const body = await request.json();
  const { quantity, unitCost, reference, notes, workOrderId } = body;

  if (quantity == null || typeof quantity !== "number" || quantity <= 0)
    return badRequest("quantity must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const transaction = await receiveStock(
      companyId,
      {
        sparePartId,
        quantity,
        unitCost: unitCost ?? null,
        reference: reference ?? null,
        notes: notes ?? null,
        workOrderId: workOrderId ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(transaction);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Spare part not found") return badRequest(msg);
    return serverError();
  }
}
