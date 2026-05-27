import { NextRequest } from "next/server";
import { addWorkOrderItem } from "@/modules/maintenance/workorders.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { created, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: workOrderId } = await params;
  const body = await request.json();
  const { itemType, description, sparePartId, quantity, unitCost } = body;

  if (!itemType || typeof itemType !== "string") return badRequest("itemType is required");
  if (!description || typeof description !== "string") return badRequest("description is required");
  if (quantity == null || typeof quantity !== "number" || quantity <= 0)
    return badRequest("quantity must be a positive number");

  try {
    const item = await addWorkOrderItem(companyId, workOrderId, {
      itemType,
      description,
      sparePartId: sparePartId ?? null,
      quantity,
      unitCost: unitCost ?? null,
    });
    return created(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Work order not found") return notFound(msg);
    if (msg === "Spare part not found") return badRequest(msg);
    if (msg.includes("Insufficient stock") || msg.includes("must be greater") || msg.includes("cannot be negative") || msg.includes("Items can only")) return badRequest(msg);
    return handleError(err);
  }
}
