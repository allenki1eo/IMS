import { NextRequest } from "next/server";
import { listNCRs, createNCR } from "@/modules/qc/ncr.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "qc:ncr:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const testId = searchParams.get("testId") ?? undefined;
  const severity = searchParams.get("severity") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { data, meta } = await listNCRs(companyId, {
    testId,
    severity,
    status,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "qc:ncr:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { testId, title, description, severity, assignedToId } = body;

  if (!title || typeof title !== "string") return badRequest("title is required");
  if (!description || typeof description !== "string") return badRequest("description is required");
  if (!severity || typeof severity !== "string") return badRequest("severity is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const ncr = await createNCR(
      companyId,
      {
        testId: testId ?? null,
        title,
        description,
        severity,
        assignedToId: assignedToId ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(ncr);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality test not found") return badRequest(msg);
    return serverError();
  }
}
