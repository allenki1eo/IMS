import { NextRequest } from "next/server";
import { getMonthlyTrends } from "@/modules/analytics/analytics.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { cache, cacheKey, TTL } from "@/lib/cache";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "analytics:dashboard:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const months = parseInt(searchParams.get("months") || "6", 10);
  if (!Number.isFinite(months) || months < 1 || months > 24) {
    return badRequest("months must be between 1 and 24");
  }

  const key = cacheKey.trends(companyId, months);
  const cached = cache.get(key);
  if (cached) return success(cached);

  try {
    const trends = await getMonthlyTrends(companyId, months);
    cache.set(key, trends, TTL.TRENDS);
    return success(trends);
  } catch (err) {
    console.error("[Analytics trends]", err);
    return handleError(err);
  }
}
