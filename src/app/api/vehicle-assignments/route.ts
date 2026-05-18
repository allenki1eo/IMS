import { NextRequest } from "next/server";
import { listAssignments, createAssignment } from "@/modules/transport/assignments.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:assignment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const vehicleId = searchParams.get("vehicleId") ?? undefined;
  const driverId = searchParams.get("driverId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listAssignments(companyId, {
      vehicleId,
      driverId,
      status,
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
  const auth = await requirePermission(request, "transport:assignment:create");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { vehicleId, driverId, notes } = body;

  if (!vehicleId || typeof vehicleId !== "string") return badRequest("vehicleId is required");
  if (!driverId || typeof driverId !== "string") return badRequest("driverId is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const assignment = await createAssignment({
      vehicleId,
      driverId,
      notes: notes ?? null,
      assignedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(assignment);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg === "Vehicle not found" ||
      msg === "Vehicle is not active" ||
      msg === "Driver not found" ||
      msg === "Driver is not available"
    ) {
      return badRequest(msg);
    }
    return handleError(err);
  }
}
