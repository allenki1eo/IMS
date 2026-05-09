import { NextRequest } from "next/server";
import { getTankLevelHistory } from "@/modules/fuel/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tankId: string }> }
) {
  const auth = await requirePermission(request, "fuel:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { tankId } = await params;
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  try {
    const result = await getTankLevelHistory(tankId, { from, to });
    if (!result) return notFound("Fuel tank not found");
    if (result.tank.companyId !== companyId) return notFound("Fuel tank not found");
    return success(result);
  } catch {
    return serverError();
  }
}
