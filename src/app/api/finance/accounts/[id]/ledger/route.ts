import { NextRequest } from "next/server";
import { getLedger } from "@/modules/finance/ledger.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:account:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  try {
    const { data, meta, openingBalance, closingBalance } = await getLedger(companyId, id, {
      fromDate,
      toDate,
      ...pagination,
    });
    return success({ items: data, meta: buildMeta(meta.total, pagination), openingBalance, closingBalance });
  } catch (err) {
    return handleError(err);
  }
}
