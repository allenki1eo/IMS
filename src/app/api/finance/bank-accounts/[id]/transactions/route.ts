import { NextRequest } from "next/server";
import { listBankTransactions, createBankTransaction } from "@/modules/finance/bank-accounts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const isClearedParam = searchParams.get("isCleared");
  const isCleared = isClearedParam === "true" ? true : isClearedParam === "false" ? false : undefined;

  try {
    const { data, meta } = await listBankTransactions(companyId, id, { ...pagination, isCleared });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch {
    return badRequest("Failed to load transactions");
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:bank:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { ipAddress } = getRequestMeta(request);

  try {
    const tx = await createBankTransaction(
      companyId,
      { ...body, bankAccountId: id },
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return created(tx);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
