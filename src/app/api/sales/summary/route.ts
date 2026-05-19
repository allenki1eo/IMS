import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, serverError, handleError } from "@/lib/response";
import { getSalesSummary } from "@/modules/sales/sales.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "sales:order:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  try {
    const summary = await getSalesSummary(companyId);
    return success(summary);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
