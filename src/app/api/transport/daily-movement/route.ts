import { NextRequest } from "next/server";
import { listDailyMovements, createDailyMovement } from "@/modules/transport/daily-movement.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:daily-movement:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);

  try {
    const { data, meta } = await listDailyMovements(companyId, {
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
  const auth = await requirePermission(request, "transport:daily-movement:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { reportDate, entries, notes } = body;

  if (!reportDate) return badRequest("reportDate is required");
  if (!Array.isArray(entries) || entries.length === 0) return badRequest("entries are required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const report = await createDailyMovement({
      companyId,
      reportDate: new Date(reportDate),
      entries: entries.map((e: {
        vehicleId: string;
        driverId?: string | null;
        vehicleStatus: string;
        tripId?: string | null;
        destination?: string | null;
        departureTime?: string | null;
        expectedReturn?: string | null;
        odometerOut?: number | null;
        fuelLevel?: string | null;
        remarks?: string | null;
      }) => ({
        vehicleId: e.vehicleId,
        driverId: e.driverId ?? null,
        vehicleStatus: e.vehicleStatus ?? "PRESENT",
        tripId: e.tripId ?? null,
        destination: e.destination ?? null,
        departureTime: e.departureTime ? new Date(e.departureTime) : null,
        expectedReturn: e.expectedReturn ? new Date(e.expectedReturn) : null,
        odometerOut: e.odometerOut ?? null,
        fuelLevel: e.fuelLevel ?? null,
        remarks: e.remarks ?? null,
      })),
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(report);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
