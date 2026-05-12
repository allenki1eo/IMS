"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { ArrowRightLeft, Calculator } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CURRENCIES = ["TZS", "USD", "EUR", "GBP"];

export default function CurrencyConverterPage() {
  const [amount, setAmount] = useState("1000");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [toCurrency, setToCurrency] = useState("TZS");
  const [useToday, setUseToday] = useState(true);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [result, setResult] = useState<{
    convertedAmount: number;
    rate: number;
    rateDate: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleConvert() {
    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    setLoading(true);
    try {
      const url = new URL("/api/finance/exchange-rates/convert", window.location.origin);
      url.searchParams.set("from", fromCurrency);
      url.searchParams.set("to", toCurrency);
      url.searchParams.set("amount", String(numAmount));
      if (!useToday && date) url.searchParams.set("date", date);

      const res = await fetch(url.toString());
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Conversion failed"); return; }
      setResult(json.data ?? json);
    } catch {
      toast.error("Network error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    handleConvert();
  }, []);

  function swap() {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
    setResult(null);
  }

  return (
    <div>
      <PageHeader title="Currency Converter" description="Convert between currencies using current exchange rates" />

      <div className="max-w-xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calculator className="h-4 w-4" />
              Convert
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label>Amount</Label>
              <Input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>

            <div className="grid gap-4 grid-cols-[1fr_auto_1fr] items-end">
              <div className="space-y-1">
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <Button variant="outline" size="icon" onClick={swap}><ArrowRightLeft className="h-4 w-4" /></Button>
              <div className="space-y-1">
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={useToday} onChange={(e) => setUseToday(e.target.checked)} />
                Use today&apos;s rate
              </label>
              {!useToday && (
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-auto" />
              )}
            </div>

            <Button onClick={handleConvert} disabled={loading} className="w-full">
              {loading ? "Converting..." : "Convert"}
            </Button>

            {result && (
              <div className="rounded-lg bg-muted p-4 text-center space-y-1">
                <p className="text-sm text-muted-foreground">
                  {Number(amount).toLocaleString()} {fromCurrency} =
                </p>
                <p className="text-3xl font-bold">
                  {result.convertedAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
                </p>
                <p className="text-xs text-muted-foreground">
                  Rate: 1 {fromCurrency} = {result.rate.toLocaleString()} {toCurrency}
                  {result.rateDate && (
                    <span> (as of {new Date(result.rateDate).toLocaleDateString()})</span>
                  )}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
