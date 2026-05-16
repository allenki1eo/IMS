import { NextRequest } from "next/server";
import { getAccount, updateAccount, toggleAccountStatus } from "@/modules/finance/accounts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

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
    return serverError();
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
