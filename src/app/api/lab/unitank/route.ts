import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listUnitankAnalyses, createUnitankAnalysis } from "@/modules/lab/lab.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:unitank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);
  const batchId = searchParams.get("batchId") ?? undefined;
  const tankNumber = searchParams.get("tankNumber") ?? undefined;

  try {
    const { analyses, total } = await listUnitankAnalyses({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
      batchId,
      tankNumber,
    });
    return paginated(analyses, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "lab:unitank:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const b = body as any;
  if (!b.tankNumber || !b.brand || !b.stage || !b.sampleDate) {
    return badRequest("tankNumber, brand, stage, and sampleDate are required");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const record = await createUnitankAnalysis({
      companyId,
      batchId: b.batchId,
      tankNumber: b.tankNumber,
      brand: b.brand,
      stage: b.stage,
      sampleDate: new Date(b.sampleDate),
      sampleTime: b.sampleTime,
      alc: b.alc,
      oe: b.oe,
      pg: b.pg,
      ph: b.ph,
      fg: b.fg,
      col: b.col,
      bu: b.bu,
      adf: b.adf,
      analystId: b.analystId,
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
