import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError, handleError } from "@/lib/response";
import { listKPIs, upsertKPI } from "@/modules/sales/sales.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "sales:kpi:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  const { searchParams } = new URL(request.url);
  try {
    const kpis = await listKPIs(companyId, searchParams.get("period") ?? undefined);
    return success(kpis);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "sales:kpi:manage");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return serverError("Company not configured");
  try {
    const body = await request.json();
    if (!body.period || !body.metric) return badRequest("period and metric are required");
    const kpi = await upsertKPI(companyId, { ...body });
    return success(kpi);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
