import { NextRequest } from "next/server";
import { getItemLedgerWithSummary } from "@/modules/warehouse/reports.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:stock:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;

  try {
    const result = await getItemLedgerWithSummary(companyId, id);
    if (!result) return notFound("Item not found");
    return success(result);
  } catch (err) {
    return handleError(err);
  }
}
