import { NextRequest } from "next/server";
import { getBankAccount, updateBankAccount, toggleBankAccountStatus } from "@/modules/finance/bank-accounts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const account = await getBankAccount(companyId, id);
  if (!account) return notFound("Bank account");
  return success(account);
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
