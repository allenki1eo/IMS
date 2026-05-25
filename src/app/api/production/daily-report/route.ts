import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "production:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);

  const today = new Date().toISOString().split("T")[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const dateFrom = searchParams.get("dateFrom") ?? sevenDaysAgo;
  const dateTo = searchParams.get("dateTo") ?? today;

  try {
    const dateFromDt = new Date(`${dateFrom}T00:00:00.000Z`);
    const dateToDt = new Date(`${dateTo}T23:59:59.999Z`);

    const [data, total] = await Promise.all([
      db.productionBatch.findMany({
        where: {
          companyId,
          status: "COMPLETED",
          completedAt: {
            gte: dateFromDt,
            lte: dateToDt,
          },
        },
        include: {
          line: { select: { name: true } },
          recipe: { select: { name: true } },
        },
        orderBy: { completedAt: "desc" },
        skip: pagination.skip,
        take: pagination.take,
      }),
      db.productionBatch.count({
        where: {
          companyId,
          status: "COMPLETED",
          completedAt: {
            gte: dateFromDt,
            lte: dateToDt,
          },
        },
      }),
    ]);

    return paginated(data, buildMeta(total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
