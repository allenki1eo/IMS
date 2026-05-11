import { NextRequest } from "next/server";
import { getProductionBatch } from "@/modules/production/batches.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const batch = await getProductionBatch(companyId, id);
  if (!batch) return notFound("Production batch not found");
  return success(batch);
}

