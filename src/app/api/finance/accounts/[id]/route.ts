import { NextRequest } from "next/server";
import { getAccount, updateAccount, toggleAccountStatus } from "@/modules/finance/accounts.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:account:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const account = await getAccount(companyId, id);
    if (!account) return notFound("Account");
    return success(account);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:account:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const account = await updateAccount(
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
  const auth = await requirePermission(request, "finance:account:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const account = await toggleAccountStatus(
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
  const auth = await requirePermission(request, "finance:account:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.account.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Account not found");

    await db.account.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName || auth.user.username,
      action: "ACCOUNT_DELETE",
      module: "finance",
      resource: "account",
      recordId: id,
      oldValue: { code: existing.code, name: existing.name },
      description: `Deleted account: ${existing.name} (${existing.code})`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
