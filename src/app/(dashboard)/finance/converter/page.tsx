"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  ArrowRightLeft,
  Calculator,
  CalendarDays,
  CircleDollarSign,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = ["TZS", "USD", "EUR", "GBP", "KES", "UGX", "RWF", "ZAR", "CNY", "INR"];

interface ConversionResult {
  convertedAmount: number;
  rate: number;
  rateDate: string;
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { year: "numeric", month: "short", day: "numeric" }).format(new Date(value));
}

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("TZS");
  const [useToday, setUseToday] = useState(true);
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const amountDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preview = useMemo(() => {
    if (!result) return null;
    const sourceAmount = Number(amount) || 0;
    return {
      source: `${formatMoney(sourceAmount)} ${fromCurrency}`,
      target: `${formatMoney(result.convertedAmount)} ${toCurrency}`,
      rate: `1 ${fromCurrency} = ${formatRate(result.rate)} ${toCurrency}`,
      inverse: `1 ${toCurrency} = ${formatRate(1 / result.rate)} ${fromCurrency}`,
    };
  }, [amount, fromCurrency, result, toCurrency]);

  async function convert(overrideAmount?: string) {
    const numericAmount = Number(overrideAmount ?? amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) return;

    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/finance/exchange-rates/convert", window.location.origin);
      url.searchParams.set("from", fromCurrency);
      url.searchParams.set("to", toCurrency);
      url.searchParams.set("amount", String(numericAmount));
      if (!useToday && date) url.searchParams.set("date", date);

      const response = await fetch(url.toString());
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "No rate found for this pair");
        return;
      }
      setResult(payload.data ?? payload);
    } catch {
      toast.error("Network error while converting currency");
    } finally {
      setLoading(false);
    }
  }

  // Auto-convert when currencies or date settings change
  useEffect(() => {
    const numericAmount = Number(amount);
    if (Number.isFinite(numericAmount) && numericAmount > 0) {
      convert();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, useToday, date]);

  // Debounced auto-convert when amount changes
  function handleAmountChange(value: string) {
    setAmount(value);
    if (amountDebounce.current) clearTimeout(amountDebounce.current);
    amountDebounce.current = setTimeout(() => {
      const num = Number(value);
      if (Number.isFinite(num) && num > 0) convert(value);
    }, 500);
  }

  useEffect(() => {
    convert();
    return () => {
      if (amountDebounce.current) clearTimeout(amountDebounce.current);
    };
    // Run once on first load with the default pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    // effect will trigger auto-convert after state updates
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currency Converter"
        description="Convert working amounts using saved finance exchange rates."
        actions={
          <Button variant="outline" asChild>
            <Link href="/finance/exchange-rates">
              <ArrowLeft className="h-4 w-4" />
              Rates
            </Link>
          </Button>
        }
      />

      <section className="grid gap-6 xl:grid-cols-[minmax(360px,520px)_1fr]">
        {/* Input card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Convert Amount
            </CardTitle>
            <CardDescription>Results update automatically as you type or change currencies.</CardDescription>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <Button type="button" variant="outline" size="icon" onClick={swapCurrencies}>
                <ArrowRightLeft className="h-4 w-4" />
              </Button>
              <div className="space-y-1.5">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useToday}
                  onChange={(e) => setUseToday(e.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Use today&apos;s latest available rate
              </label>
              {!useToday && (
                <div className="mt-3 space-y-1.5">
                  <Label>As Of Date</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                </div>
              )}
            </div>

            <Button onClick={() => convert()} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {loading ? "Converting..." : "Convert"}
            </Button>
          </CardContent>
        </Card>

        {/* Result card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              Result
              {loading && <RefreshCw className="ml-auto h-3.5 w-3.5 animate-spin text-muted-foreground" />}
            </CardTitle>
            <CardDescription>The converter uses the latest saved rate on or before the selected date.</CardDescription>
          </CardHeader>
          <CardContent>
            {error ? (
              <div className="flex min-h-[260px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed text-center">
                <p className="text-sm font-medium text-destructive">{error}</p>
                <p className="text-xs text-muted-foreground">
                  Add a rate for {fromCurrency} → {toCurrency} in the{" "}
                  <Link href="/finance/exchange-rates" className="underline underline-offset-2">
                    Exchange Rates
                  </Link>{" "}
                  page first.
                </p>
              </div>
            ) : preview && result ? (
              <div className={`space-y-6 transition-opacity duration-150 ${loading ? "opacity-50" : "opacity-100"}`}>
                <div className="rounded-lg border bg-muted/40 p-6">
                  <div className="text-sm text-muted-foreground">{preview.source}</div>
                  <div className="mt-2 text-3xl font-bold tracking-normal">{preview.target}</div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Badge variant="info">{preview.rate}</Badge>
                    <Badge variant="outline" className="gap-1">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatDate(result.rateDate)}
                    </Badge>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">Source Currency</div>
                    <div className="mt-1 text-2xl font-semibold">{fromCurrency}</div>
                  </div>
                  <div className="rounded-md border p-4">
                    <div className="text-sm text-muted-foreground">Target Currency</div>
                    <div className="mt-1 text-2xl font-semibold">{toCurrency}</div>
                  </div>
                </div>

                <div className="rounded-md border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Inverse: </span>
                  {preview.inverse}
                </div>
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                {loading ? "Converting..." : "Enter an amount and convert to see the result."}
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
