import { NextRequest } from "next/server";
import { getOrder, updateOrder } from "@/modules/dispatch/orders.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const order = await getOrder(companyId, id);
  if (!order) return notFound("Dispatch order not found");

  return success(order);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const {
    customerName,
    customerContact,
    deliveryAddress,
    scheduledDate,
    vehicleId,
    driverId,
    notes,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateOrder(
      companyId,
      id,
      {
        ...(customerName !== undefined ? { customerName } : {}),
        ...(customerContact !== undefined ? { customerContact } : {}),
        ...(deliveryAddress !== undefined ? { deliveryAddress } : {}),
        ...(scheduledDate !== undefined ? { scheduledDate } : {}),
        ...(vehicleId !== undefined ? { vehicleId } : {}),
        ...(driverId !== undefined ? { driverId } : {}),
        ...(notes !== undefined ? { notes } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Dispatch order not found") return notFound(msg);
    if (
      msg === "Only DRAFT orders can be updated" ||
      msg === "Vehicle not found" ||
      msg === "Driver not found"
    )
      return badRequest(msg);
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.dispatchOrder.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Dispatch order not found");

    if (existing.status !== "DRAFT") return badRequest("Only DRAFT dispatch orders can be deleted");

    const lineCount = await db.dispatchOrderLine.count({ where: { orderId: id } });
    if (lineCount > 0) return badRequest("Dispatch orders with lines cannot be deleted");

    await db.dispatchOrder.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "DISPATCH_ORDER_DELETE",
      module: "dispatch",
      resource: "order",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted dispatch order: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
