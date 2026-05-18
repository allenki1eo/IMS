import { NextRequest } from "next/server";
import { listIssues, createIssue } from "@/modules/fuel/issues.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:issue:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const tankId = searchParams.get("tankId") ?? undefined;
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const driverId = searchParams.get("driverId") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const { data, meta } = await listIssues(companyId, {
      search,
      tankId,
      vehicleId,
      driverId,
      from,
      to,
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
  const auth = await requirePermission(request, "fuel:issue:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    tankId,
    vehicleId,
    driverId,
    tripId,
    quantityLiters,
    pricePerLiter,
    odometerReading,
    notes,
  } = body;

  if (!tankId || typeof tankId !== "string") return badRequest("tankId is required");
  if (!vehicleId || typeof vehicleId !== "string") return badRequest("vehicleId is required");
  if (quantityLiters == null || typeof quantityLiters !== "number" || quantityLiters <= 0)
    return badRequest("quantityLiters must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const issue = await createIssue({
      companyId,
      tankId,
      vehicleId,
      driverId: driverId ?? null,
      tripId: tripId ?? null,
      quantityLiters,
      pricePerLiter: pricePerLiter ?? null,
      odometerReading: odometerReading ?? null,
      notes: notes ?? null,
      issuedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(issue);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel tank not found") return badRequest(msg);
    if (msg === "Vehicle not found") return badRequest(msg);
    if (msg === "Fuel tank is inactive") return badRequest(msg);
    if (msg.includes("Insufficient fuel")) return badRequest(msg);
    return handleError(err);
  }
}
