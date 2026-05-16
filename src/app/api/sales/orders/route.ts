import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError } from "@/lib/response";
import { listSalesOrders, upsertSalesOrder } from "@/modules/sales/sales.service";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "sales:order:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  try {
    const { orders, total } = await listSalesOrders(companyId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      customerId: searchParams.get("customerId") ?? undefined,
      dateFrom: searchParams.get("dateFrom") ?? undefined,
      dateTo: searchParams.get("dateTo") ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return success({ data: orders, meta: buildMeta(total, pagination) });
  } catch (err) {
    console.error(err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "sales:order:create");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  try {
    const body = await request.json();
    if (!body.reference) return badRequest("reference is required");
    if (!body.customerId) return badRequest("customerId is required");
    const order = await upsertSalesOrder(companyId, body);
    return created(order);
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
