import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listMicroReports, createMicroReport } from "@/modules/lab/lab.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:micro:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);

  try {
    const { reports, total } = await listMicroReports({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return paginated(reports, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
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

  try {
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
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
