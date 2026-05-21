import { NextRequest } from "next/server";
import { getTankById, updateTank } from "@/modules/fuel/tanks.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:tank:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const tank = await getTankById(id);
    if (!tank) return notFound("Fuel tank not found");
    return success(tank);
  } catch (err) {
    console.error("[API Error] GET /api/fuel-tanks/[id]", err);
    return handleError(err);
  }
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:tank:delete");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.fuelTank.findUnique({ where: { id } });
    if (!existing) return notFound("Fuel tank not found");

    await db.fuelTank.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "FUEL_TANK_DELETE",
      module: "fuel",
      resource: "tank",
      recordId: id,
      oldValue: { name: existing.name, code: existing.code },
      description: `Deleted fuel tank: ${existing.name} (${existing.code})`,
      ipAddress,
      companyId: existing.companyId,
    });

    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel tank not found") return notFound(msg);
    return handleError(err);
  }
}
