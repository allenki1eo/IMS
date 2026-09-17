import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listBBTAnalyses, createBBTAnalysis } from "@/modules/lab/lab.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:bbt:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);
  const batchId = searchParams.get("batchId") ?? undefined;

  try {
    const { analyses, total } = await listBBTAnalyses({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
      batchId,
    });
    return paginated(analyses, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "lab:bbt:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const b = body as any;
  if (!b.bbtNumber || !b.brand || !b.sampleDate) {
    return badRequest("bbtNumber, brand, and sampleDate are required");
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const record = await createBBTAnalysis({
      companyId,
      batchId: b.batchId,
      fromTankNumber: b.fromTankNumber,
      bbtNumber: b.bbtNumber,
      brand: b.brand,
      sampleDate: new Date(b.sampleDate),
      sampleTime: b.sampleTime,
      pg: b.pg,
      og: b.og,
      alc: b.alc,
      haze: b.haze,
      ph: b.ph,
      col: b.col,
      dissolvedO2: b.dissolvedO2,
      bitterness: b.bitterness,
      bbtTemp: b.bbtTemp,
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
