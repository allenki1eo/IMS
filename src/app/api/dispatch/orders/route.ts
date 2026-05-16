import { NextRequest } from "next/server";
import { listOrders, createOrder } from "@/modules/dispatch/orders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const customerName = searchParams.get("customerName") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listOrders(companyId, {
      customerName,
      status,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:order:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

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

  if (!customerName || typeof customerName !== "string")
    return badRequest("customerName is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const order = await createOrder(
      companyId,
      {
        customerName,
        customerContact: customerContact ?? null,
        deliveryAddress: deliveryAddress ?? null,
        scheduledDate: scheduledDate ?? null,
        vehicleId: vehicleId ?? null,
        driverId: driverId ?? null,
        notes: notes ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Vehicle not found" || msg === "Driver not found") return badRequest(msg);
    return serverError();
  }
}
