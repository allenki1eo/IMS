import { NextRequest } from "next/server";
import { listWorkOrders, createWorkOrder } from "@/modules/maintenance/workorders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:workorder:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const plantAssetId = searchParams.get("plantAssetId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;
  const fromStr = searchParams.get("from");
  const toStr = searchParams.get("to");

  try {
    const { data, meta } = await listWorkOrders(companyId, {
      vehicleId,
      plantAssetId,
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
    plantAssetId,
    scheduleId,
    maintenanceType,
    description,
    priority,
    assignedToId,
    workshopName,
    estimatedCost,
  } = body;

  const hasVehicle = typeof vehicleId === "string" && vehicleId.length > 0;
  const hasPlant = typeof plantAssetId === "string" && plantAssetId.length > 0;
  if (!hasVehicle && !hasPlant) {
    return badRequest("vehicleId or plantAssetId is required");
  }
  if (hasVehicle && hasPlant) {
    return badRequest("Provide vehicleId or plantAssetId, not both");
  }
  if (!maintenanceType || typeof maintenanceType !== "string")
    return badRequest("maintenanceType is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const workOrder = await createWorkOrder(
      companyId,
      {
        vehicleId: hasVehicle ? vehicleId : null,
        plantAssetId: hasPlant ? plantAssetId : null,
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
    if (
      msg === "Vehicle not found" ||
      msg === "Plant asset not found" ||
      msg === "Plant asset is not active" ||
      msg === "Maintenance schedule not found" ||
      msg.includes("selected vehicle") ||
      msg.includes("vehicleId or plantAssetId") ||
      msg.includes("not both") ||
      msg.includes("only be linked")
    )
      return badRequest(msg);
    if (msg.includes("cannot be negative")) return badRequest(msg);
    return handleError(err);
  }
}
