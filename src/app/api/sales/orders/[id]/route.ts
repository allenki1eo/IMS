import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound, badRequest, serverError, handleError } from "@/lib/response";
import { getSalesOrderById, updateSalesOrderStatus } from "@/modules/sales/sales.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "sales:order:read");
  if ("error" in auth) return auth.error;
  try {
    const { id } = await params;
    const order = await getSalesOrderById(id);
    if (!order) return notFound("Sales order not found");
    return success(order);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "sales:order:update");
  if ("error" in auth) return auth.error;
  try {
    const { id } = await params;
    const body = await request.json();
    if (!body.status) return badRequest("status is required");
    const order = await updateSalesOrderStatus(id, body.status, body.dispatchRef);
    return success(order);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
