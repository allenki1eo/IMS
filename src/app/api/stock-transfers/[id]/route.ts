import { NextRequest } from "next/server";
import { getTransferById } from "@/modules/warehouse/transfers.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:transfer:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const transfer = await getTransferById(id);
  if (!transfer) return notFound("Transfer not found");
  if (transfer.companyId !== companyId) return notFound("Transfer not found");
  return success(transfer);
}
