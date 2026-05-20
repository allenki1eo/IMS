import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "transport:vehicle:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ids, status } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");

  const VALID_STATUSES = ["ACTIVE", "INACTIVE", "MAINTENANCE", "DECOMMISSIONED"];
  if (!VALID_STATUSES.includes(status)) return badRequest("Invalid status");

  try {
    await db.vehicle.updateMany({
      where: { id: { in: ids }, companyId },
      data: { status },
    });
    return success({ updated: ids.length });
  } catch (err) {
    return handleError(err);
  }
}
