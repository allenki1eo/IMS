import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listMicroReports, createMicroReport } from "@/modules/lab/lab.service";
import { success, created, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:micro:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
  const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20"));

  const data = await listMicroReports({ companyId, page, pageSize });
  return success(data);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "lab:micro:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const b = body as any;
  if (!b.reportDate) return badRequest("reportDate is required");
  if (!Array.isArray(b.samples) || b.samples.length === 0) return badRequest("samples are required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  const report = await createMicroReport({
    companyId,
    reportDate: new Date(b.reportDate),
    analystId: b.analystId,
    samples: b.samples,
    notes: b.notes,
    createdById: auth.user.id,
    userName: auth.user.fullName,
    ipAddress,
    userAgent,
  });

  return created(report);
}
