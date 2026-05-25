import { NextRequest } from "next/server";
import { getBankAccount, updateBankAccount, toggleBankAccountStatus } from "@/modules/finance/bank-accounts.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound , handleError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const account = await getBankAccount(companyId, id);
    if (!account) return notFound("Bank account");
    return success(account);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const account = await updateBankAccount(
      companyId,
      id,
      body,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return success(account);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const account = await toggleBankAccountStatus(
      companyId,
      id,
      body.isActive,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return success(account);
  } catch (err: any) {
    return badRequest(err.message);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.bankAccount.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Bank account not found");

    await db.bankAccount.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName || auth.user.username,
      action: "BANK_ACCOUNT_DELETE",
      module: "finance",
      resource: "bank",
      recordId: id,
      oldValue: { name: existing.name, accountNumber: existing.accountNumber },
      description: `Deleted bank account: ${existing.name}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
