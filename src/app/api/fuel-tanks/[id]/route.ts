import { NextRequest } from "next/server";
import { getTankById, updateTank } from "@/modules/fuel/tanks.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:tank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const tank = await getTankById(id);
  if (!tank) return notFound("Fuel tank not found");
  if (tank.companyId !== companyId) return notFound("Fuel tank not found");

  return success(tank);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:tank:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { branchId, name, code, fuelType, capacity, minLevel, notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateTank({
      id,
      data: {
        ...(branchId !== undefined ? { branchId } : {}),
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(fuelType !== undefined ? { fuelType } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(minLevel !== undefined ? { minLevel } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel tank not found") return notFound(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Tank code already exists");
    return handleError(err);
  }
}
