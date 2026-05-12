import { NextRequest } from "next/server";
import { createExchangeRate } from "@/modules/finance/exchange-rates.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";

// Currencies available on frankfurter.app that we support
const SUPPORTED = ["USD", "EUR", "GBP", "ZAR", "CNY", "INR"];

// Regional currencies not available on frankfurter — must be entered manually
const MANUAL_ONLY = ["TZS", "KES", "UGX", "RWF"];

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { ipAddress } = getRequestMeta(request);
  const body = await request.json().catch(() => ({}));
  const baseCurrency: string = body.base ?? "USD";

  if (!SUPPORTED.includes(baseCurrency)) {
    return badRequest(`Base currency ${baseCurrency} is not available on the live feed. Supported: ${SUPPORTED.join(", ")}`);
  }

  // Fetch from frankfurter.app (free, no API key needed)
  let rawRates: Record<string, number>;
  try {
    const resp = await fetch(
      `https://api.frankfurter.app/latest?from=${baseCurrency}&to=${SUPPORTED.filter((c) => c !== baseCurrency).join(",")}`,
      { next: { revalidate: 0 } }
    );
    if (!resp.ok) {
      return badRequest("Failed to fetch rates from frankfurter.app — try again later");
    }
    const data = await resp.json();
    rawRates = data.rates as Record<string, number>;
  } catch {
    return serverError();
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results: { pair: string; rate: number; status: "created" | "skipped" }[] = [];

  for (const [toCurrency, rate] of Object.entries(rawRates)) {
    try {
      await createExchangeRate({
        companyId,
        fromCurrency: baseCurrency,
        toCurrency,
        rate,
        source: "MARKET",
        effectiveDate: today,
        notes: "Auto-synced via frankfurter.app",
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
    summary: { created, skipped, manualOnly: MANUAL_ONLY },
    message: `${created} rate(s) synced, ${skipped} already existed for today. Regional currencies (${MANUAL_ONLY.join(", ")}) must be entered manually.`,
  });
}
