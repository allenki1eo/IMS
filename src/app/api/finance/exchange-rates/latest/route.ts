import { NextRequest } from "next/server";
import { getActiveRate } from "@/modules/finance/exchange-rates.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound , serverError} from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fromCurrency = searchParams.get("from");
  const toCurrency = searchParams.get("to");

  if (!fromCurrency || !toCurrency) {
    return badRequest("from and to are required");
  }

  try {
    const rate = await getActiveRate(companyId, fromCurrency, toCurrency);
    if (!rate) return notFound("Exchange rate not found");

    return success(rate);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}
