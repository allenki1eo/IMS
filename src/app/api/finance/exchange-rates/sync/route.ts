import { NextRequest } from "next/server";
import { createExchangeRate } from "@/modules/finance/exchange-rates.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

// All currencies we track — exchangerate-api.com supports all of them including East African currencies
const SUPPORTED = ["USD", "EUR", "GBP", "ZAR", "CNY", "INR", "TZS", "KES", "UGX", "RWF"];

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) {
    return badRequest("EXCHANGERATE_API_KEY is not configured. Add it to your environment variables.");
  }

  const { ipAddress } = getRequestMeta(request);
  const body = await request.json().catch(() => ({}));
  const baseCurrency: string = body.base ?? "USD";

  if (!SUPPORTED.includes(baseCurrency)) {
    return badRequest(`Unsupported base currency: ${baseCurrency}. Supported: ${SUPPORTED.join(", ")}`);
  }

  // Fetch from exchangerate-api.com — supports all currencies including TZS, KES, UGX, RWF
  let rawRates: Record<string, number>;
  try {
    const resp = await fetch(
      `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${baseCurrency}`,
      { cache: "no-store" }
    );
    const data = await resp.json();
    if (!resp.ok || data.result !== "success") {
      const detail = data["error-type"] ?? "unknown error";
      return badRequest(`ExchangeRate API error: ${detail}`);
    }
    rawRates = data.conversion_rates as Record<string, number>;
  } catch (err) {
    return handleError(err);
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const targets = SUPPORTED.filter((c) => c !== baseCurrency);
  const results: { pair: string; rate: number; status: "created" | "skipped" }[] = [];

  for (const toCurrency of targets) {
    const rate = rawRates[toCurrency];
    if (rate == null) continue;

    try {
      await createExchangeRate({
        companyId,
        fromCurrency: baseCurrency,
        toCurrency,
        rate,
        source: "MARKET",
        effectiveDate: today,
        notes: "Auto-synced via ExchangeRate API",
        createdById: auth.user.id,
        userName: auth.user.fullName || auth.user.username,
        ipAddress,
      });
      results.push({ pair: `${baseCurrency}/${toCurrency}`, rate, status: "created" });
    } catch {
      // Duplicate on this date — skip silently
      results.push({ pair: `${baseCurrency}/${toCurrency}`, rate, status: "skipped" });
    }
  }

  const created = results.filter((r) => r.status === "created").length;
  const skipped = results.filter((r) => r.status === "skipped").length;

  return success({
    results,
    summary: { created, skipped },
    message: `${created} rate(s) synced, ${skipped} already existed for today.`,
  });
}
