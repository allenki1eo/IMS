import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listCIPRecords, createCIPRecord } from "@/modules/brewing/brewing.service";
import { success, created, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:cip:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));
  const vessel = searchParams.get("vessel") ?? undefined;

  const data = await listCIPRecords({ companyId, page, pageSize, vessel });
  return success(data);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:cip:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const b = body as any;
  if (!b.vessel || !b.cipDate) return badRequest("vessel and cipDate are required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  const record = await createCIPRecord({
    companyId,
    vessel: b.vessel,
    cipDate: new Date(b.cipDate),
    startTime: b.startTime,
    endTime: b.endTime,
    causticTemp: b.causticTemp,
    causticHL: b.causticHL,
    causticTimeMin: b.causticTimeMin,
    causticCondition: b.causticCondition,
    pushWaterHL: b.pushWaterHL,
    nitricAcidPct: b.nitricAcidPct,
    nitricHL: b.nitricHL,
    nitricTimeMin: b.nitricTimeMin,
    rinsingWaterHL: b.rinsingWaterHL,
    rinsingTimeMin: b.rinsingTimeMin,
    carryOver: b.carryOver,
    operatorSign: b.operatorSign,
    notes: b.notes,
    createdById: auth.user.id,
    userName: auth.user.fullName,
    ipAddress,
    userAgent,
  });

  return created(record);
}
