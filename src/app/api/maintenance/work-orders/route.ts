import { NextRequest } from "next/server";
import { listWorkOrders, createWorkOrder } from "@/modules/maintenance/workorders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:workorder:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  try {
    const { data, meta } = await listWorkOrders(companyId, {
      vehicleId,
      status,
      priority,
      completedFrom: fromStr ? new Date(fromStr) : undefined,
      completedTo: toStr ? new Date(toStr) : undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:workorder:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    vehicleId,
    scheduleId,
    maintenanceType,
    description,
    priority,
    assignedToId,
    workshopName,
    estimatedCost,
  } = body;

  if (!vehicleId || typeof vehicleId !== "string") return badRequest("vehicleId is required");
  if (!maintenanceType || typeof maintenanceType !== "string")
    return badRequest("maintenanceType is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const workOrder = await createWorkOrder(
      companyId,
      {
        vehicleId,
        scheduleId: scheduleId ?? null,
        maintenanceType,
        description: description ?? null,
        priority: priority ?? "NORMAL",
        assignedToId: assignedToId ?? null,
        workshopName: workshopName ?? null,
        estimatedCost: estimatedCost ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(workOrder);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found" || msg === "Maintenance schedule not found")
      return badRequest(msg);
    return handleError(err);
  }
}
