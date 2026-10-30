import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";
import { getOverview } from "@/modules/data-center/data-center.service";
import { dataCenterError, parseYear } from "../_shared";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "data:upload:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const year = parseYear(new URL(request.url).searchParams.get("year"));
    return success(await getOverview(companyId, year));
  } catch (err) {
    return dataCenterError(err);
  }
}
