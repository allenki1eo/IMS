import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError, handleError } from "@/lib/response";
import { listCustomers, upsertCustomer } from "@/modules/sales/sales.service";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "sales:customer:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  try {
    const { customers, total } = await listCustomers(companyId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return success({ data: customers, meta: buildMeta(total, pagination) });
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "sales:customer:create");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  try {
    const body = await request.json();
    if (!body.name) return badRequest("name is required");
    const customer = await upsertCustomer(companyId, {
      code: body.code ?? body.name.toUpperCase().replace(/\s+/g, "_").slice(0, 20),
      ...body,
    });
    return created(customer);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
