import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { listSyncLogs } from "@/modules/finance/tally.service";
import { success, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:tally:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const data = await listSyncLogs(companyId);
    return success(data);
  } catch (err) {
    return handleError(err);
  }
}
