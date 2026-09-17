import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listBrewingSessions, createBrewingSession } from "@/modules/brewing/brewing.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:session:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);
  const batchId = searchParams.get("batchId") ?? undefined;
  const brand = searchParams.get("brand") ?? undefined;

  try {
    const { sessions, total } = await listBrewingSessions({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
      batchId,
      brand,
    });
    return paginated(sessions, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:session:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const { brewDate, brand, brewNumber, batchId, activities, notes } = body as any;
  if (!brewDate || !brand) return badRequest("brewDate and brand are required");
  if (!Array.isArray(activities) || activities.length === 0) return badRequest("activities are required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const session = await createBrewingSession({
      companyId,
      batchId,
      brewDate: new Date(brewDate),
      brand,
      brewNumber,
      activities,
      notes,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(session);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
