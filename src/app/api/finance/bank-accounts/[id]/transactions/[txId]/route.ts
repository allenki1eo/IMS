import { NextRequest } from "next/server";
import { toggleBankTransactionCleared } from "@/modules/finance/bank-accounts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; txId: string }> }) {
  const auth = await requirePermission(request, "finance:bank:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id: bankAccountId, txId } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await toggleBankTransactionCleared(
      companyId,
      txId,
      body.isCleared,
      body.clearedAt,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return success(updated);
  } catch (err: any) {
    if (err.message === "Transaction not found") return notFound("Transaction");
    return badRequest(err.message);
  }
}
