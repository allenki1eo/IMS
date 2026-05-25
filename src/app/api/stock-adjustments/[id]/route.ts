import { NextRequest } from "next/server";
import { getAdjustmentById } from "@/modules/warehouse/adjustments.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:adjustment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const adjustment = await getAdjustmentById(id);
  if (!adjustment) return notFound("Adjustment not found");
  if (adjustment.companyId !== companyId) return notFound("Adjustment not found");
  return success(adjustment);
}
