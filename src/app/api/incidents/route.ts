import { NextRequest } from "next/server";
import { listIncidents, createIncident } from "@/modules/transport/incidents.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:incident:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const incidentType = searchParams.get("incidentType") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { data, meta } = await listIncidents(companyId, {
    search,
    vehicleId,
    incidentType,
    status,
    page: paginationParams.page,
    pageSize: paginationParams.pageSize,
  });

  return paginated(data, buildMeta(meta.total, paginationParams));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "transport:incident:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { vehicleId, tripId, incidentType, incidentDate, location, description } = body;

  if (!vehicleId || typeof vehicleId !== "string") return badRequest("vehicleId is required");
  if (!incidentType || typeof incidentType !== "string") return badRequest("incidentType is required");
  if (!incidentDate) return badRequest("incidentDate is required");
  if (!description || typeof description !== "string") return badRequest("description is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const incident = await createIncident({
      companyId,
      vehicleId,
      tripId: tripId ?? null,
      incidentType,
      incidentDate: new Date(incidentDate),
      location: location ?? null,
      description,
      reportedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(incident);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found" || msg === "Trip not found") return badRequest(msg);
    return serverError();
  }
}
