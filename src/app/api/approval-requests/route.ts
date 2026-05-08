import { NextRequest } from "next/server";
import { listApprovalRequests } from "@/modules/approvals/approvals.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, badRequest } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "approvals:request:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const params = parsePagination(searchParams);

  const { requests, total } = await listApprovalRequests({
    companyId,
    ...params,
    status: searchParams.get("status") ?? undefined,
    module: searchParams.get("module") ?? undefined,
  });

  return paginated(requests, buildMeta(total, params));
}
