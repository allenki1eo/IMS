import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listCIPRecords, createCIPRecord } from "@/modules/brewing/brewing.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "brewing:cip:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);
  const vessel = searchParams.get("vessel") ?? undefined;

  try {
    const { records, total } = await listCIPRecords({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
      vessel,
    });
    return paginated(records, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
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

  try {
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
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
