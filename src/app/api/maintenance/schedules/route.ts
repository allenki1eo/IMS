import { NextRequest } from "next/server";
import { listSchedules, createSchedule } from "@/modules/maintenance/schedules.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:schedule:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const maintenanceType = searchParams.get("maintenanceType") ?? undefined;

  const { data, meta } = await listSchedules(companyId, {
    vehicleId,
    maintenanceType,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:schedule:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    vehicleId,
    maintenanceType,
    description,
    intervalKm,
    intervalDays,
    lastDoneAt,
    lastDoneOdometer,
    nextDueAt,
    nextDueOdometer,
  } = body;

  if (!vehicleId || typeof vehicleId !== "string") return badRequest("vehicleId is required");
  if (!maintenanceType || typeof maintenanceType !== "string")
    return badRequest("maintenanceType is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const schedule = await createSchedule(
      companyId,
      {
        vehicleId,
        maintenanceType,
        description: description ?? null,
        intervalKm: intervalKm ?? null,
        intervalDays: intervalDays ?? null,
        lastDoneAt: lastDoneAt ?? null,
        lastDoneOdometer: lastDoneOdometer ?? null,
        nextDueAt: nextDueAt ?? null,
        nextDueOdometer: nextDueOdometer ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(schedule);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found") return badRequest(msg);
    return serverError();
  }
}
