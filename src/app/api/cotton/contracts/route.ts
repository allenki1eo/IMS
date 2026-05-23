import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { buildMeta } from "@/lib/pagination";
import { listContracts, createContract } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:contract:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const status = searchParams.get("status") ?? undefined;
  const buyerId = searchParams.get("buyerId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const { data, meta } = await listContracts(companyId, { status, buyerId, search, page, limit });
    return paginated(data, buildMeta(meta.total, { page: meta.page, pageSize: meta.pageSize, skip: 0, take: meta.pageSize }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:contract:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { buyerId, pricePerKg, currency, lotIds, notes, contractDate } = body;
  if (!buyerId) return badRequest("buyerId is required");
  if (!pricePerKg || typeof pricePerKg !== "number") return badRequest("pricePerKg must be a number");
  if (!Array.isArray(lotIds) || lotIds.length === 0) return badRequest("lotIds array is required");

  try {
    const contract = await createContract(
      companyId,
      {
        buyerId,
        pricePerKg,
        currency,
        lotIds,
        notes,
        contractDate: contractDate ? new Date(contractDate) : undefined,
      },
      auth.user.id
    );
    return created(contract);
  } catch (err) {
    return handleError(err);
  }
}
