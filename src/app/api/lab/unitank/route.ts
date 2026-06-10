import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listUnitankAnalyses, createUnitankAnalysis } from "@/modules/lab/lab.service";
import { success, created, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:unitank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));
  const batchId = searchParams.get("batchId") ?? undefined;
  const tankNumber = searchParams.get("tankNumber") ?? undefined;

  const data = await listUnitankAnalyses({ companyId, page, pageSize, batchId, tankNumber });
  return success(data);
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
}
