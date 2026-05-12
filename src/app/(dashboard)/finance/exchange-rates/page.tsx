"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CalendarDays,
  Calculator,
  CircleDollarSign,
  Filter,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  effectiveDate: string;
  notes: string | null;
  createdAt?: string;
}

interface FormState {
  fromCurrency: string;
  toCurrency: string;
  rate: string;
  source: string;
  effectiveDate: string;
  notes: string;
}

const CURRENCIES = ["TZS", "USD", "EUR", "GBP", "KES", "UGX", "RWF", "ZAR", "CNY", "INR"];
const ALL = "ALL";

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatRate(rate: number) {
  return new Intl.NumberFormat(undefined, {
    maximumFractionDigits: 6,
  }).format(rate);
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

function sourceVariant(source: string): "secondary" | "info" | "outline" {
  if (source === "MARKET") return "info";
  if (source === "MANUAL") return "secondary";
  return "outline";
}

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [filterFrom, setFilterFrom] = useState(ALL);
  const [filterTo, setFilterTo] = useState(ALL);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>({
    fromCurrency: "USD",
    toCurrency: "TZS",
    rate: "",
    source: "MANUAL",
    effectiveDate: today(),
    notes: "",
  });

  const fetchRates = useCallback(async (showSpinner = false) => {
    if (showSpinner) setRefreshing(true);
    try {
      const params = new URLSearchParams({ pageSize: "200" });
      if (filterFrom !== ALL) params.set("from", filterFrom);
      if (filterTo !== ALL) params.set("to", filterTo);

      const response = await fetch(`/api/finance/exchange-rates?${params.toString()}`);
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error ?? "Failed to load exchange rates");
        return;
      }

      setRates(payload.data ?? []);
    } catch {
      toast.error("Failed to load exchange rates");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filterFrom, filterTo]);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  const filteredRates = useMemo(() => {
    const term = search.trim().toUpperCase();
    if (!term) return rates;
    return rates.filter((rate) =>
      [rate.fromCurrency, rate.toCurrency, rate.source, rate.notes ?? ""]
        .join(" ")
        .toUpperCase()
        .includes(term)
    );
  }, [rates, search]);

  const activePair = useMemo(() => {
    return rates.find(
      (rate) =>
        rate.fromCurrency === form.fromCurrency &&
        rate.toCurrency === form.toCurrency
    );
  }, [form.fromCurrency, form.toCurrency, rates]);

  const uniquePairs = useMemo(() => {
    return new Set(rates.map((rate) => `${rate.fromCurrency}-${rate.toCurrency}`)).size;
  }, [rates]);

  const marketRateCount = useMemo(() => rates.filter((rate) => rate.source === "MARKET").length, [rates]);

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function swapPair() {
    setForm((current) => ({
      ...current,
      fromCurrency: current.toCurrency,
      toCurrency: current.fromCurrency,
    }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();

    const rate = Number(form.rate);
    if (form.fromCurrency === form.toCurrency) {
      toast.error("Choose two different currencies");
      return;
    }
    if (!Number.isFinite(rate) || rate <= 0) {
      toast.error("Enter a valid positive rate");
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch("/api/finance/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency: form.fromCurrency,
          toCurrency: form.toCurrency,
          rate,
          source: form.source,
          effectiveDate: form.effectiveDate,
          notes: form.notes.trim() || undefined,
        }),
      });
      const payload = await response.json();
      if (!response.ok) {
        toast.error(payload.error ?? "Failed to add exchange rate");
        return;
      }

      toast.success("Exchange rate added");
      setForm((current) => ({ ...current, rate: "", notes: "" }));
      fetchRates(true);
    } catch {
      toast.error("Network error while adding rate");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(rate: ExchangeRate) {
    const confirmed = window.confirm(
      `Delete ${rate.fromCurrency} to ${rate.toCurrency} at ${formatRate(rate.rate)}?`
    );
    if (!confirmed) return;

    setDeletingId(rate.id);
    try {
      const response = await fetch(`/api/finance/exchange-rates/${rate.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        toast.error(payload.error ?? "Failed to delete exchange rate");
        return;
      }

      toast.success("Exchange rate deleted");
      fetchRates(true);
    } catch {
      toast.error("Network error while deleting rate");
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Exchange Rates"
        description="Manage daily currency rates used by finance, procurement, payments, and reports."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" asChild>
              <Link href="/finance/converter">
                <Calculator className="h-4 w-4" />
                Converter
              </Link>
            </Button>
            <Button variant="outline" onClick={() => fetchRates(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-3">
        <Card className="border-l-4 border-l-primary">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Stored Rates</CardTitle>
            <CircleDollarSign className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{rates.length}</div>
            <p className="mt-1 text-xs text-muted-foreground">Total records in this company</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Currency Pairs</CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{uniquePairs}</div>
            <p className="mt-1 text-xs text-muted-foreground">Distinct conversion pairs</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market Sources</CardTitle>
            <TrendingDown className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{marketRateCount}</div>
            <p className="mt-1 text-xs text-muted-foreground">Rates marked as market sourced</p>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Add Rate
            </CardTitle>
            <CardDescription>
              Enter one unit of the source currency in the target currency.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Select value={form.fromCurrency} onValueChange={(value) => updateForm("fromCurrency", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={swapPair}>
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Select value={form.toCurrency} onValueChange={(value) => updateForm("toCurrency", value)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((currency) => (
                        <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activePair && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <div className="font-medium">Latest saved rate for this pair</div>
                  <div className="mt-1 text-muted-foreground">
                    1 {activePair.fromCurrency} = {formatRate(activePair.rate)} {activePair.toCurrency}
                    {" "}on {formatDate(activePair.effectiveDate)}
                  </div>
                </div>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Rate</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.000001"
                    value={form.rate}
                    onChange={(event) => updateForm("rate", event.target.value)}
                    placeholder="2600.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(event) => updateForm("effectiveDate", event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(value) => updateForm("source", value)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                    <SelectItem value="BANK">Bank</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Notes</Label>
                <Input
                  value={form.notes}
                  onChange={(event) => updateForm("notes", event.target.value)}
                  placeholder="Optional reference or source note"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                <Plus className="h-4 w-4" />
                {submitting ? "Adding..." : "Add Exchange Rate"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Filter className="h-4 w-4 text-primary" />
                  Rate Register
                </CardTitle>
                <CardDescription>Filter and review rates by pair, source, and effective date.</CardDescription>
              </div>
              <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[560px]">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search"
                  />
                </div>
                <Select value={filterFrom} onValueChange={setFilterFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All from</SelectItem>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={filterTo} onValueChange={setFilterTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All to</SelectItem>
                    {CURRENCIES.map((currency) => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-y bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Pair</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Rate</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRates.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                        No exchange rates match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredRates.map((rate) => (
                      <tr key={rate.id} className="border-b transition-colors hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 font-medium">
                            <span>{rate.fromCurrency}</span>
                            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>{rate.toCurrency}</span>
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            1 {rate.fromCurrency} in {rate.toCurrency}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold">{formatRate(rate.rate)}</td>
                        <td className="px-4 py-3">
                          <Badge variant={sourceVariant(rate.source)}>{rate.source}</Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            {formatDate(rate.effectiveDate)}
                          </div>
                        </td>
                        <td className="max-w-[260px] truncate px-4 py-3 text-muted-foreground">
                          {rate.notes || "-"}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={() => handleDelete(rate)}
                            disabled={deletingId === rate.id}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
