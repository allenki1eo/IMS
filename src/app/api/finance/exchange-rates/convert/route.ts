import { NextRequest } from "next/server";
import { convertAmount } from "@/modules/finance/exchange-rates.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fromCurrency = searchParams.get("from");
  const toCurrency = searchParams.get("to");
  const amountParam = searchParams.get("amount");
  const dateParam = searchParams.get("date");

  if (!fromCurrency || !toCurrency || amountParam == null) {
    return badRequest("from, to, and amount are required");
  }

  const amount = Number(amountParam);
  if (isNaN(amount)) return badRequest("amount must be a number");

  try {
    const result = await convertAmount(
      companyId,
      fromCurrency,
      toCurrency,
      amount,
      dateParam ? new Date(dateParam) : undefined
    );
    return success(result);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
