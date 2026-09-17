import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId, parseBody } from "@/lib/api-helpers";
import { listProductSpecs, createProductSpec } from "@/modules/lab/lab.service";
import { created, badRequest, paginated, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "lab:spec:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { searchParams } = request.nextUrl;
  const pagination = parsePagination(searchParams);

  try {
    const { specs, total } = await listProductSpecs({
      companyId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return paginated(specs, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "lab:spec:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not found");

  const { body, error } = await parseBody(request);
  if (error) return error;

  const b = body as any;
  if (!b.brand) return badRequest("brand is required");
  if (!Array.isArray(b.parameters) || b.parameters.length === 0) return badRequest("parameters are required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const spec = await createProductSpec({
      companyId,
      brand: b.brand,
      productCode: b.productCode,
      version: b.version,
      parameters: b.parameters,
      notes: b.notes,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(spec);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
