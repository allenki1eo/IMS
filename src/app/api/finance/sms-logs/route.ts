import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, handleError } from "@/lib/response";
import { listFinanceSmsLogs } from "@/modules/finance/finance-sms.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "settings:settings:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  const { searchParams } = new URL(request.url);
  const alertType = searchParams.get("alertType") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);
  // Optional: filter deposit logs to current company; EOD logs are global (companyId null)
  const scope = searchParams.get("scope"); // company | all
  const filterCompany = scope === "company" ? companyId ?? undefined : undefined;

  try {
    const result = await listFinanceSmsLogs({
      alertType,
      companyId: filterCompany,
      page,
      pageSize,
    });
    return success({
      data: result.logs,
      meta: {
        total: result.total,
        page: result.page,
        pageSize: result.pageSize,
        totalPages: Math.ceil(result.total / result.pageSize),
      },
    });
  } catch (err) {
    return handleError(err);
  }
}
