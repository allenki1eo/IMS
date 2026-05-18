import { NextRequest } from "next/server";
import { getTodayMovement } from "@/modules/transport/daily-movement.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "transport:daily-movement:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const result = await getTodayMovement(companyId);
    return success(result);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
