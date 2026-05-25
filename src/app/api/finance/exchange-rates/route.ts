import { NextRequest } from "next/server";
import {
  listExchangeRates,
  createExchangeRate,
} from "@/modules/finance/exchange-rates.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const fromCurrency = searchParams.get("from") || undefined;
  const toCurrency = searchParams.get("to") || undefined;

  try {
    const { data, meta } = await listExchangeRates(companyId, {
      fromCurrency,
      toCurrency,
      ...pagination,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { fromCurrency, toCurrency, rate, source, effectiveDate, notes } = body;

  if (!fromCurrency || !toCurrency || rate == null) {
    return badRequest("fromCurrency, toCurrency, and rate are required");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const record = await createExchangeRate({
      companyId,
      fromCurrency,
      toCurrency,
      rate: Number(rate),
      source: source || "MANUAL",
      effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName || auth.user.username,
      ipAddress,
    });
    return created(record);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
