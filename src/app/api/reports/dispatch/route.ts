import { NextRequest } from "next/server";
import { getDispatchReport } from "@/modules/reports/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "reports:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  try {
    const report = await getDispatchReport(companyId, fromDate, toDate);
    return success(report);
  } catch {
    return badRequest("Failed to generate dispatch report");
  }
}
