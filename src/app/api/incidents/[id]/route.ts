import { NextRequest } from "next/server";
import { getIncidentById, updateIncident } from "@/modules/transport/incidents.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:incident:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const incident = await getIncidentById(id);
  if (!incident) return notFound("Incident not found");
  if (incident.companyId !== companyId) return notFound("Incident not found");

  return success(incident);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:incident:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { status, resolutionNotes, resolvedAt } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateIncident({
      id,
      data: {
        ...(status !== undefined ? { status } : {}),
        ...(resolutionNotes !== undefined ? { resolutionNotes } : {}),
        ...(resolvedAt !== undefined
          ? { resolvedAt: resolvedAt ? new Date(resolvedAt) : null }
          : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Incident not found") return notFound(msg);
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "transport:incident:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const incident = await getIncidentById(id);
  if (!incident) return notFound("Incident not found");
  if (incident.companyId !== companyId) return notFound("Incident not found");

  const { ipAddress } = getRequestMeta(request);

  try {
    await db.vehicleIncident.delete({ where: { id } });
    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "INCIDENT_DELETE",
      module: "transport",
      resource: "incident",
      recordId: id,
      description: `Deleted vehicle incident record`,
      ipAddress,
      companyId,
    });
    return success({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
