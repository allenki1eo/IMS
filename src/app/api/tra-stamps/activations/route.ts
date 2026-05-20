import { NextRequest } from "next/server";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";
import { listStampActivations, createStampActivation } from "@/modules/tra-stamps/tra-stamps.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "tra:stamp:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  try {
    const { data, meta } = await listStampActivations(companyId, {
      search: searchParams.get("search") ?? undefined,
      batchId: searchParams.get("batchId") ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "tra:stamp:activate");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  if (!body.batchId || !body.productName || !body.quantity) {
    return badRequest("batchId, productName, and quantity are required");
  }

  try {
    const activation = await createStampActivation(companyId, body, auth.user.id, auth.user.fullName, ipAddress);
    return created(activation);
  } catch (err) {
    return handleError(err);
  }
}
