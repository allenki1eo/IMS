import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function PATCH(request: NextRequest) {
  const auth = await requirePermission(request, "transport:driver:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ids, status, isAvailable } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");

  try {
    if (status !== undefined) {
      const VALID = ["ACTIVE", "INACTIVE"];
      if (!VALID.includes(status)) return badRequest("Invalid status");

      const data: Record<string, unknown> = { status };
      // Setting inactive always removes availability; setting active doesn't force available
      // (driver may still be on an active assignment)
      if (status === "INACTIVE") data.isAvailable = false;

      await db.driver.updateMany({ where: { id: { in: ids }, companyId }, data });
    } else if (isAvailable !== undefined) {
      if (typeof isAvailable !== "boolean") return badRequest("isAvailable must be boolean");
      await db.driver.updateMany({ where: { id: { in: ids }, companyId }, data: { isAvailable } });
    } else {
      return badRequest("Provide status or isAvailable");
    }

    return success({ updated: ids.length });
  } catch (err) {
    return handleError(err);
  }
}
