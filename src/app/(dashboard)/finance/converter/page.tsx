"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, ArrowRightLeft, Calculator, CalendarDays, CircleDollarSign, RefreshCw } from "lucide-react";
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
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}

function formatRate(value: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("TZS");
  const [useToday, setUseToday] = useState(true);
  const [date, setDate] = useState(today());
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);

  const preview = useMemo(() => {
    if (!result) return null;
    const sourceAmount = Number(amount) || 0;
    return {
      source: `${formatMoney(sourceAmount)} ${fromCurrency}`,
      target: `${formatMoney(result.convertedAmount)} ${toCurrency}`,
      rate: `1 ${fromCurrency} = ${formatRate(result.rate)} ${toCurrency}`,
    };
  }, [amount, fromCurrency, result, toCurrency]);

  async function handleConvert() {
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }

    setLoading(true);
    try {
      const url = new URL("/api/finance/exchange-rates/convert", window.location.origin);
      url.searchParams.set("from", fromCurrency);
      url.searchParams.set("to", toCurrency);
      url.searchParams.set("amount", String(numericAmount));
      if (!useToday && date) url.searchParams.set("date", date);

      const response = await fetch(url.toString());
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error ?? "Conversion failed");
        return;
      }

      setResult(payload.data ?? payload);
    } catch {
      toast.error("Network error while converting currency");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleConvert();
    // Run once on first load with the default pair.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function swapCurrencies() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calculator className="h-4 w-4 text-primary" />
              Convert Amount
            </CardTitle>
            <CardDescription>Select a saved pair and optional historical date.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1.5">
              <Label>Amount</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>

            <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
              <div className="space-y-1.5">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="rounded-md border p-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useToday}
                  onChange={(event) => setUseToday(event.target.checked)}
                  className="h-4 w-4 rounded border-input"
                />
                Use today's latest available rate
              </label>
              {!useToday && (
                <div className="mt-3 space-y-1.5">
                  <Label>As Of Date</Label>
                  <Input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                </div>
              )}
            </div>

            <Button onClick={handleConvert} disabled={loading} className="w-full">
              {loading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Calculator className="h-4 w-4" />}
              {loading ? "Converting..." : "Convert"}
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CircleDollarSign className="h-4 w-4 text-primary" />
              Result
            </CardTitle>
            <CardDescription>The converter uses the latest saved rate on or before the selected date.</CardDescription>
          </CardHeader>
          <CardContent>
            {preview && result ? (
              <div className="space-y-6">
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
              </div>
            ) : (
              <div className="flex min-h-[260px] items-center justify-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">
                Enter an amount and convert to see the result.
              </div>
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
