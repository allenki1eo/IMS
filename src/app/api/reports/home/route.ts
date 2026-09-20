import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";
import { getDirectorHome, getOpsHome } from "@/modules/reports/home.service";

/**
 * GET /api/reports/home?view=director|ops&lineFamily=BREWING|SPIRITS|ALL
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "reports:report:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const view = (searchParams.get("view") ?? "ops").toLowerCase();
  const lineFamily = searchParams.get("lineFamily");

  try {
    if (view === "director") {
      const data = await getDirectorHome();
      return success(data);
    }

    const companyId = await getCompanyId(request);
    if (!companyId) return badRequest("Company not configured");

    const data = await getOpsHome(companyId, lineFamily);
    return success(data);
  } catch (err) {
    console.error("[API Error] reports home", err);
    return handleError(err);
  }
}
