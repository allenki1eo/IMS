import { NextRequest } from "next/server";
import { listVehicles, createVehicle } from "@/modules/transport/vehicles.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:vehicle:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const vehicleType = searchParams.get("vehicleType") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;

  try {
    const { data, meta } = await listVehicles({
      search,
      status,
      vehicleType,
      branchId,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
    });
    return paginated(data, buildMeta(meta.total, paginationParams));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:vehicle:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    branchId,
    plateNumber,
    make,
    model,
    year,
    vehicleType,
    usageType,
    capacity,
    fuelType,
    fuelTankCapacity,
    color,
    chassisNumber,
    engineNumber,
    odometer,
    insuranceExpiry,
    roadWorthyExpiry,
    nextServiceDate,
    notes,
  } = body;

  if (!plateNumber || typeof plateNumber !== "string") return badRequest("plateNumber is required");
  if (!make || typeof make !== "string") return badRequest("make is required");
  if (!model || typeof model !== "string") return badRequest("model is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const vehicle = await createVehicle({
      companyId,
      branchId: branchId ?? null,
      plateNumber,
      make,
      model,
      year: year ?? null,
      vehicleType: vehicleType ?? "TRUCK",
      usageType: usageType ?? "OWNED",
      capacity: capacity ?? null,
      fuelType: fuelType ?? "DIESEL",
      fuelTankCapacity: fuelTankCapacity ?? null,
      color: color ?? null,
      chassisNumber: chassisNumber ?? null,
      engineNumber: engineNumber ?? null,
      odometer: odometer ?? 0,
      insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
      roadWorthyExpiry: roadWorthyExpiry ? new Date(roadWorthyExpiry) : null,
      nextServiceDate: nextServiceDate ? new Date(nextServiceDate) : null,
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(vehicle);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique") || msg.toLowerCase().includes("plate")) {
      return badRequest("Plate number already exists");
    }
    return handleError(err);
  }
}
