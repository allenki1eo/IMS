import { NextRequest } from "next/server";
import { listAuditLogs } from "@/modules/audit/audit.service";
import { requirePermission } from "@/lib/api-helpers";
import { paginated, badRequest , serverError} from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "audit:log:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const params = parsePagination(searchParams);

  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  try {
    const { logs, total } = await listAuditLogs({
      ...params,
      module: searchParams.get("module") ?? undefined,
      resource: searchParams.get("resource") ?? undefined,
      userId: searchParams.get("userId") ?? undefined,
      action: searchParams.get("action") ?? undefined,
      recordId: searchParams.get("recordId") ?? undefined,
      from: fromParam ? new Date(fromParam) : undefined,
      to: toParam ? new Date(toParam) : undefined,
    });

    return paginated(logs, buildMeta(total, params));
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}
