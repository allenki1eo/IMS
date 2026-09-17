import { NextRequest } from "next/server";
import { listOrders, createOrder } from "@/modules/dispatch/orders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? searchParams.get("customerName") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listOrders(companyId, {
      search,
      status,
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
    lines,
  } = body;

  if (!customerName || typeof customerName !== "string" || !customerName.trim())
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
        lines: Array.isArray(lines) ? lines : undefined,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg.includes("not found") ||
      msg.includes("required") ||
      msg.includes("must be") ||
      msg.includes("Insufficient") ||
      msg.includes("inactive") ||
      msg.includes("available")
    )
      return badRequest(msg);
    return handleError(err);
  }
}
