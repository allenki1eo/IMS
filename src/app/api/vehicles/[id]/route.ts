import { NextRequest } from "next/server";
import { getVehicleById, updateVehicle } from "@/modules/transport/vehicles.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:vehicle:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const vehicle = await getVehicleById(id, companyId);
  if (!vehicle) return notFound("Vehicle not found");

  return success(vehicle);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const {
    branchId,
    plateNumber,
    make,
    model,
    year,
    vehicleType,
    capacity,
    fuelType,
    color,
    chassisNumber,
    engineNumber,
    insuranceExpiry,
    roadWorthyExpiry,
    lastServiceDate,
    nextServiceDate,
    notes,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateVehicle({
      id,
      data: {
        ...(branchId !== undefined ? { branchId } : {}),
        ...(plateNumber !== undefined ? { plateNumber } : {}),
        ...(make !== undefined ? { make } : {}),
        ...(model !== undefined ? { model } : {}),
        ...(year !== undefined ? { year } : {}),
        ...(vehicleType !== undefined ? { vehicleType } : {}),
        ...(capacity !== undefined ? { capacity } : {}),
        ...(fuelType !== undefined ? { fuelType } : {}),
        ...(color !== undefined ? { color } : {}),
        ...(chassisNumber !== undefined ? { chassisNumber } : {}),
        ...(engineNumber !== undefined ? { engineNumber } : {}),
        ...(insuranceExpiry !== undefined
          ? { insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null }
          : {}),
        ...(roadWorthyExpiry !== undefined
          ? { roadWorthyExpiry: roadWorthyExpiry ? new Date(roadWorthyExpiry) : null }
          : {}),
        ...(lastServiceDate !== undefined
          ? { lastServiceDate: lastServiceDate ? new Date(lastServiceDate) : null }
          : {}),
        ...(nextServiceDate !== undefined
          ? { nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null }
          : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found") return notFound(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Plate number already exists");
    return handleError(err);
  }
}
