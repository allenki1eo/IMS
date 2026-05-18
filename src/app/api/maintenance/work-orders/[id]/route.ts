import { NextRequest } from "next/server";
import { getWorkOrder, updateWorkOrder } from "@/modules/maintenance/workorders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const workOrder = await getWorkOrder(companyId, id);
  if (!workOrder) return notFound("Work order not found");

  return success(workOrder);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const {
    maintenanceType,
    description,
    priority,
    assignedToId,
    workshopName,
    estimatedCost,
    notes,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateWorkOrder(
      companyId,
      id,
      {
        ...(maintenanceType !== undefined ? { maintenanceType } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(priority !== undefined ? { priority } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
        ...(workshopName !== undefined ? { workshopName } : {}),
        ...(estimatedCost !== undefined ? { estimatedCost } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Work order not found") return notFound(msg);
    if (msg.includes("Only PENDING")) return badRequest(msg);
    return handleError(err);
  }
}
