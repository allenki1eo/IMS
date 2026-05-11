import { NextRequest } from "next/server";
import {
  getSchedule,
  updateSchedule,
  deleteSchedule,
} from "@/modules/maintenance/schedules.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:schedule:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const schedule = await getSchedule(companyId, id);
  if (!schedule) return notFound("Maintenance schedule not found");

  return success(schedule);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:schedule:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
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
    isActive,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateSchedule(
      companyId,
      id,
      {
        ...(vehicleId !== undefined ? { vehicleId } : {}),
        ...(maintenanceType !== undefined ? { maintenanceType } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(intervalKm !== undefined ? { intervalKm } : {}),
        ...(intervalDays !== undefined ? { intervalDays } : {}),
        ...(lastDoneAt !== undefined ? { lastDoneAt } : {}),
        ...(lastDoneOdometer !== undefined ? { lastDoneOdometer } : {}),
        ...(nextDueAt !== undefined ? { nextDueAt } : {}),
        ...(nextDueOdometer !== undefined ? { nextDueOdometer } : {}),
        ...(isActive !== undefined ? { isActive } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Maintenance schedule not found") return notFound(msg);
    return serverError();
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:schedule:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    await deleteSchedule(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Maintenance schedule not found") return notFound(msg);
    if (msg.includes("Cannot delete")) return badRequest(msg);
    return serverError();
  }
}
