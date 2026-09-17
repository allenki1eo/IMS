import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listBrewMaterialUsages, createBrewMaterialUsage } from "@/modules/brewing/brewing.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:material:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);
  const batchId = searchParams.get("batchId") ?? undefined;

  try {
    const { usages, total } = await listBrewMaterialUsages({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
      batchId,
    });
    return paginated(usages, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:material:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const { brewDate, brand, batchId, items, notes } = body as any;
  if (!brewDate || !brand) return badRequest("brewDate and brand are required");
  if (!Array.isArray(items) || items.length === 0) return badRequest("items are required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const usage = await createBrewMaterialUsage({
      companyId,
      batchId,
      brewDate: new Date(brewDate),
      brand,
      items,
      notes,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(usage);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
