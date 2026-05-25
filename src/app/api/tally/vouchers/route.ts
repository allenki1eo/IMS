import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { listVouchers } from "@/modules/finance/tally.service";
import { paginated, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:tally:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const voucherType = searchParams.get("voucherType") || undefined;
  const from = searchParams.get("from") || undefined;
  const to = searchParams.get("to") || undefined;
  const search = searchParams.get("search") || undefined;

  try {
    const { data, total } = await listVouchers(companyId, {
      voucherType,
      from,
      to,
      search,
      ...pagination,
    });
    return paginated(data, buildMeta(total, pagination));
  } catch (err) {
    return handleError(err);
  }
}
