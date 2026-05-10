import { NextRequest } from "next/server";
import { listBankAccounts, createBankAccount } from "@/modules/finance/bank-accounts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:bank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") || undefined;
  const accountType = searchParams.get("accountType") || undefined;
  const isActive = searchParams.has("isActive")
    ? searchParams.get("isActive") === "true"
    : undefined;

  try {
    const { data, meta } = await listBankAccounts(companyId, {
      search,
      accountType,
      isActive,
      ...pagination,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:bank:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  if (!body.name) {
    return badRequest("Name is required");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const account = await createBankAccount(
      companyId,
      body,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return created(account);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
