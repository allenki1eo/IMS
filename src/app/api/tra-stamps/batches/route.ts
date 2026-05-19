import { NextRequest } from "next/server";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";
import { listStampBatches, createStampBatch } from "@/modules/tra-stamps/tra-stamps.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "tra:stamp:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  try {
    const { data, meta } = await listStampBatches(companyId, {
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "tra:stamp:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  if (!body.batchNumber || !body.quantity) {
    return badRequest("batchNumber and quantity are required");
  }

  try {
    const batch = await createStampBatch(companyId, body, auth.user.id, auth.user.fullName, ipAddress);
    return created(batch);
  } catch (err) {
    return handleError(err);
  }
}
