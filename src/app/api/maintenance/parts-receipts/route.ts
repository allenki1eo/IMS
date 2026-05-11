import { NextRequest } from "next/server";
import { listReceipts } from "@/modules/maintenance/receipts.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, badRequest } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:spare_part:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const sparePartId = searchParams.get("sparePartId") ?? undefined;

  const { data, meta } = await listReceipts(companyId, {
    sparePartId,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}
