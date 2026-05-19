import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { getStampBatch } from "@/modules/tra-stamps/tra-stamps.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "tra:stamp:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;

  try {
    const batch = await getStampBatch(companyId, id);
    if (!batch) return notFound("Stamp batch not found");
    return success(batch);
  } catch (err) {
    return handleError(err);
  }
}
