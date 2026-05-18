"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  Calculator,
  CircleDollarSign,
  RefreshCw,
  Wifi,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

const CURRENCIES = ["TZS", "USD", "EUR", "GBP", "KES", "UGX", "RWF", "ZAR", "CNY", "INR"];

const CURRENCY_FLAGS: Record<string, string> = {
  TZS: "🇹🇿", USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧",
  KES: "🇰🇪", UGX: "🇺🇬", RWF: "🇷🇼", ZAR: "🇿🇦",
  CNY: "🇨🇳", INR: "🇮🇳",
};

function fmt(n: number, decimals = 2) {
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n);
}

function fmtRate(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 4 }).format(n);
}

interface ConversionResult {
  convertedAmount: number;
  rate: number;
  from: string;
  to: string;
}

interface RateBoard {
  base: string;
  rates: Record<string, number>;
}

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("TZS");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [converting, setConverting] = useState(false);
  const [board, setBoard] = useState<RateBoard | null>(null);
  const [boardLoading, setBoardLoading] = useState(true);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch rate board (all currencies vs TZS base)
  const fetchBoard = useCallback(async (base = "USD") => {
    setBoardLoading(true);
    try {
      const res = await fetch(`/api/finance/converter?base=${base}`);
      const payload = await res.json();
      if (!res.ok) { toast.error(payload.error ?? "Failed to fetch rates"); return; }
      setBoard(payload.data);
    } catch {
      toast.error("Network error fetching rates");
    } finally {
      setBoardLoading(false);
    }
  }, []);

  useEffect(() => { fetchBoard("USD"); }, [fetchBoard]);

  const convert = useCallback(async (overrideAmount?: string) => {
    const num = Number(overrideAmount ?? amount);
    if (!Number.isFinite(num) || num <= 0) return;
    setConverting(true);
    try {
      const res = await fetch(
        `/api/finance/converter?from=${fromCurrency}&to=${toCurrency}&amount=${num}`
      );
      const payload = await res.json();
      if (!res.ok) { toast.error(payload.error ?? "Conversion failed"); return; }
      setResult(payload.data);
    } catch {
      toast.error("Network error");
    } finally {
      setConverting(false);
    }
  }, [amount, fromCurrency, toCurrency]);

  // Auto-convert when currencies change
  useEffect(() => {
    const num = Number(amount);
    if (Number.isFinite(num) && num > 0) convert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency]);

  // Initial load
  useEffect(() => {
    convert();
    return () => { if (debounce.current) clearTimeout(debounce.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleAmountChange(value: string) {
    setAmount(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) convert(value);
    }, 500);
  }

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency Converter"
        description="Live exchange rates powered by ExchangeRate API."
        actions={
          <Button variant="outline" size="sm" onClick={() => fetchBoard("USD")} disabled={boardLoading}>
            <RefreshCw className={boardLoading ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh Rates
          </Button>
        }
      />

      {/* Converter + Result */}
      <section className="grid gap-6 xl:grid-cols-[minmax(340px,480px)_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Convert Amount
            </CardTitle>
            <CardDescription>Results update automatically as you type.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => handleAmountChange(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CURRENCY_FLAGS[c]} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={swapCurrencies}>
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {CURRENCY_FLAGS[c]} {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={() => convert()} disabled={converting} className="w-full">
              {converting
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Converting…</>
                : <><Calculator className="h-4 w-4" /> Convert</>
              }
            </Button>
          </CardContent>
        </Card>

        {/* Result */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              Result
              {converting && <RefreshCw className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>Live rate — updates in real time.</CardDescription>
          </CardHeader>
          <CardContent>
            {result ? (
              <div className={`space-y-5 transition-opacity ${converting ? "opacity-50" : "opacity-100"}`}>
                <div className="rounded-xl border bg-muted/40 px-6 py-5">
                  <p className="text-sm text-muted-foreground">
                    {CURRENCY_FLAGS[fromCurrency]} {fmt(Number(amount))} {fromCurrency}
                  </p>
                  <p className="mt-2 text-4xl font-bold tracking-tight">
                    {CURRENCY_FLAGS[toCurrency]} {fmt(result.convertedAmount)} {toCurrency}
                  </p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Badge variant="info">
                      1 {fromCurrency} = {fmtRate(result.rate)} {toCurrency}
                    </Badge>
                    <Badge variant="outline">
                      1 {toCurrency} = {fmtRate(1 / result.rate)} {fromCurrency}
                    </Badge>
                    <Badge variant="secondary" className="gap-1">
                      <Wifi className="h-3 w-3" /> Live
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">You send</p>
                    <p className="mt-1 text-xl font-semibold">{CURRENCY_FLAGS[fromCurrency]} {fmt(Number(amount))} {fromCurrency}</p>
                  </div>
                  <div className="rounded-md border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">Recipient gets</p>
                    <p className="mt-1 text-xl font-semibold">{CURRENCY_FLAGS[toCurrency]} {fmt(result.convertedAmount)} {toCurrency}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex min-h-[240px] items-center justify-center rounded-lg border border-dashed text-sm text-muted-foreground">
                {converting ? "Converting…" : "Enter an amount above to convert."}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* Live Rate Board */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Wifi className="h-4 w-4 text-primary" />
                Live Rate Board
              </CardTitle>
              <CardDescription>All currencies vs USD — live from ExchangeRate API.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {boardLoading ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg border bg-muted/30" />
              ))}
            </div>
          ) : board ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              {CURRENCIES.filter((c) => c !== board.base).map((c) => {
                const rate = board.rates[c];
                if (rate == null) return null;
                return (
                  <button
                    key={c}
                    onClick={() => { setFromCurrency(board.base); setToCurrency(c); }}
                    className="flex items-center justify-between rounded-lg border bg-muted/20 px-4 py-3 text-left hover:bg-muted/50 transition-colors"
                  >
                    <div>
                      <p className="text-xs text-muted-foreground">{board.base} →</p>
                      <p className="font-semibold">{CURRENCY_FLAGS[c]} {c}</p>
                    </div>
                    <p className="text-right font-mono text-sm font-medium">{fmtRate(rate)}</p>
                  </button>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Could not load live rates. Check your EXCHANGERATE_API_KEY.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
