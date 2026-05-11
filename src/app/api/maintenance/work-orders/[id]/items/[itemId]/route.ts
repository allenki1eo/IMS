import { NextRequest } from "next/server";
import { removeWorkOrderItem } from "@/modules/maintenance/workorders.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { noContent, badRequest, notFound, serverError } from "@/lib/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: workOrderId, itemId } = await params;

  try {
    await removeWorkOrderItem(companyId, workOrderId, itemId);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Work order not found" || msg === "Work order item not found") return notFound(msg);
    return serverError();
  }
}
