import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { addBalesToLot, removeBaleFromLot } from "@/modules/cotton/cotton.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:lot:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: lotId } = await params;
  const body = await request.json();
  const { baleIds } = body;
  if (!Array.isArray(baleIds) || baleIds.length === 0) return badRequest("baleIds array is required");

  try {
    const lot = await addBalesToLot(companyId, lotId, baleIds, auth.user.id);
    return success(lot);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:lot:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: lotId } = await params;
  const body = await request.json();
  const { baleId } = body;
  if (!baleId) return badRequest("baleId is required");

  try {
    const lot = await removeBaleFromLot(companyId, lotId, baleId, auth.user.id);
    return success(lot);
  } catch (err) {
    return handleError(err);
  }
}
