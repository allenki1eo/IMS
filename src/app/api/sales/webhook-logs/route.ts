import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, serverError } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "sales:webhook:manage");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  try {
    const logs = await db.salesWebhookLog.findMany({
      where: { companyId },
      orderBy: { processedAt: "desc" },
      take: 100,
    });
    return success(logs);
  } catch (err) {
    console.error(err);
    return serverError();
  }
}
