import { NextRequest } from "next/server";
import { getConsumptionByVehicle } from "@/modules/fuel/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;
  const vehicleId = searchParams.get("vehicleId") ?? undefined;

  try {
    const data = await getConsumptionByVehicle(companyId, { from, to, vehicleId });
    return success(data);
  } catch {
    return serverError();
  }
}
