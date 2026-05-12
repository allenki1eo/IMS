import { NextRequest } from "next/server";
import { deleteExchangeRate } from "@/modules/finance/exchange-rates.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    await deleteExchangeRate(
      id,
      companyId,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return success({ deleted: true });
  } catch (err: any) {
    if (err.message === "Exchange rate not found") return notFound(err.message);
    return badRequest(err.message);
  }
}
