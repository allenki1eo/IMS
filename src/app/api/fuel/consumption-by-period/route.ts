import { NextRequest } from "next/server";
import { getConsumptionByPeriod } from "@/modules/fuel/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const groupByParam = searchParams.get("groupBy") ?? "day";
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const tankId = searchParams.get("tankId") ?? undefined;

  if (!["day", "week", "month"].includes(groupByParam)) {
    return badRequest("groupBy must be one of: day, week, month");
  }

  try {
    const data = await getConsumptionByPeriod(companyId, {
      groupBy: groupByParam as "day" | "week" | "month",
      from,
      to,
      tankId,
    });
    return success(data);
  } catch {
    return serverError();
  }
}
