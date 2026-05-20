import { NextRequest } from "next/server";
import { listTrips, createTrip } from "@/modules/transport/trips.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:trip:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const driverId = searchParams.get("driverId") ?? undefined;

  try {
    const { data, meta } = await listTrips(companyId, {
      search,
      status,
      vehicleId,
      driverId,
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
  const auth = await requirePermission(request, "transport:trip:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    branchId,
    vehicleId,
    driverId,
    origin,
    destination,
    scheduledDeparture,
    scheduledArrival,
    cargoDescription,
    cargoWeight,
    priority,
    notes,
    cargo,
  } = body;

  if (!origin || typeof origin !== "string") return badRequest("origin is required");
  if (!destination || typeof destination !== "string") return badRequest("destination is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const trip = await createTrip({
      companyId,
      branchId: branchId ?? null,
      vehicleId: vehicleId ?? null,
      driverId: driverId ?? null,
      origin,
      destination,
      scheduledDeparture: scheduledDeparture ? new Date(scheduledDeparture) : null,
      scheduledArrival: scheduledArrival ? new Date(scheduledArrival) : null,
      cargoDescription: cargoDescription ?? null,
      cargoWeight: cargoWeight ?? null,
      priority: priority ?? "NORMAL",
      notes: notes ?? null,
      cargo: cargo ?? [],
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(trip);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Trip not found") return badRequest(msg);
    return handleError(err);
  }
}
