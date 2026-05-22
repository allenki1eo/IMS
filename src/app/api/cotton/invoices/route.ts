import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, badRequest, handleError } from "@/lib/response";
import { buildMeta } from "@/lib/pagination";
import { listInvoices } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:invoice:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listInvoices(companyId, { status, page, limit });
    return paginated(data, buildMeta(meta.total, { page: meta.page, pageSize: meta.pageSize, skip: 0, take: meta.pageSize }));
  } catch (err) {
    return handleError(err);
  }
}
