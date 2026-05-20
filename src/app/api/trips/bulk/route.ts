import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { ids, action } = body;

  if (!Array.isArray(ids) || ids.length === 0) return badRequest("No IDs provided");
  if (action !== "cancel" && action !== "delete") return badRequest("Invalid action");

  const auth = await requirePermission(
    request,
    action === "delete" ? "transport:trip:delete" : "transport:trip:update"
  );
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    if (action === "cancel") {
      const updated = await db.tripOrder.updateMany({
        where: {
          id: { in: ids },
          companyId,
          status: { in: ["PLANNED", "DISPATCHED"] },
        },
        data: { status: "CANCELLED" },
      });
      return success({ updated: updated.count });
    } else {
      // Delete related records first, then the trips
      await db.tripCargo.deleteMany({ where: { tripId: { in: ids } } });
      await db.tripLog.deleteMany({ where: { tripId: { in: ids } } });
      const deleted = await db.tripOrder.deleteMany({
        where: { id: { in: ids }, companyId },
      });
      return success({ updated: deleted.count });
    }
  } catch (err) {
    return handleError(err);
  }
}
