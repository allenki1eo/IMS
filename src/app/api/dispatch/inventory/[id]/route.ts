import { NextRequest } from "next/server";
import { getLot, updateLot } from "@/modules/dispatch/inventory.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:lot:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const lot = await getLot(companyId, id);
  if (!lot) return notFound("Lot not found");

  return success(lot);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:lot:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { lotNumber, unitCost, bestBefore, warehouseId, status, notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateLot(
      companyId,
      id,
      {
        ...(lotNumber !== undefined ? { lotNumber } : {}),
        ...(unitCost !== undefined ? { unitCost } : {}),
        ...(bestBefore !== undefined ? { bestBefore } : {}),
        ...(warehouseId !== undefined ? { warehouseId } : {}),
        ...(status !== undefined ? { status } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Lot not found") return notFound(msg);
    if (msg === "Warehouse not found") return badRequest(msg);
    return handleError(err);
  }
}
