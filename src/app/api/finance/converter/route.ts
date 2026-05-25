import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

const CURRENCIES = ["USD", "EUR", "GBP", "TZS", "KES", "UGX", "RWF", "ZAR", "CNY", "INR"];

// Cached rates per base to avoid hitting the API on every keystroke
// Cache expires after 10 minutes
const rateCache = new Map<string, { rates: Record<string, number>; ts: number }>();
const CACHE_TTL = 10 * 60 * 1000;

async function getLiveRates(base: string): Promise<Record<string, number>> {
  const cached = rateCache.get(base);
  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.rates;

  const apiKey = process.env.EXCHANGERATE_API_KEY;
  if (!apiKey) throw new Error("EXCHANGERATE_API_KEY is not configured");

  const resp = await fetch(
    `https://v6.exchangerate-api.com/v6/${apiKey}/latest/${base}`,
    { cache: "no-store" }
  );
  const data = await resp.json();
  if (!resp.ok || data.result !== "success") {
    throw new Error(`ExchangeRate API error: ${data["error-type"] ?? "unknown"}`);
  }

  const rates: Record<string, number> = {};
  for (const c of CURRENCIES) {
    if (data.conversion_rates[c] != null) rates[c] = data.conversion_rates[c];
  }

  rateCache.set(base, { rates, ts: Date.now() });
  return rates;
}

// GET /api/finance/converter?from=USD&to=TZS&amount=1000
// GET /api/finance/converter?base=USD  — returns all rates for the board
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const amountParam = searchParams.get("amount");
  const base = searchParams.get("base");

  try {
    // Rate board mode — return all rates for a base currency
    if (base && !from) {
      if (!CURRENCIES.includes(base)) return badRequest(`Unsupported currency: ${base}`);
      const rates = await getLiveRates(base);
      return success({ base, rates, currencies: CURRENCIES });
    }

    // Conversion mode
    if (!from || !to || amountParam == null) {
      return badRequest("from, to, and amount are required");
    }
    const amount = Number(amountParam);
    if (isNaN(amount) || amount <= 0) return badRequest("amount must be a positive number");
    if (!CURRENCIES.includes(from)) return badRequest(`Unsupported currency: ${from}`);
    if (!CURRENCIES.includes(to)) return badRequest(`Unsupported currency: ${to}`);

    if (from === to) {
      return success({ convertedAmount: amount, rate: 1, source: "LIVE" });
    }

    const rates = await getLiveRates(from);
    const rate = rates[to];
    if (rate == null) return badRequest(`No rate available for ${from} → ${to}`);

    return success({
      convertedAmount: amount * rate,
      rate,
      from,
      to,
      source: "LIVE",
    });
  } catch (err) {
    return handleError(err);
  }
}
