import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";
import { listSeasons, createSeason } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:season:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    const seasons = await listSeasons(companyId);
    return success(seasons);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:season:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, startDate, endDate, isActive } = body;
  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!startDate) return badRequest("startDate is required");

  const { ipAddress } = getRequestMeta(request);
  void ipAddress;

  try {
    const season = await createSeason(
      companyId,
      {
        name,
        startDate: new Date(startDate),
        endDate: endDate ? new Date(endDate) : null,
        isActive: isActive !== false,
      },
      auth.user.id
    );
    return created(season);
  } catch (err) {
    return handleError(err);
  }
}
