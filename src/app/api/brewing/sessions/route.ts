import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listBrewingSessions, createBrewingSession } from "@/modules/brewing/brewing.service";
import { success, created, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:session:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));
  const batchId = searchParams.get("batchId") ?? undefined;
  const brand = searchParams.get("brand") ?? undefined;

  const data = await listBrewingSessions({ companyId, page, pageSize, batchId, brand });
  return success(data);
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
}
