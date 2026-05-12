"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowRightLeft,
  CalendarDays,
  Calculator,
  CircleDollarSign,
  Filter,
  LayoutGrid,
  Plus,
  RefreshCw,
  Search,
  Wifi,
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

const CURRENCY_COLORS: Record<string, string> = {
  TZS: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  USD: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  EUR: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300",
  GBP: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300",
  KES: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
  UGX: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  RWF: "bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300",
  ZAR: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  CNY: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-300",
  INR: "bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300",
};

function CurrencyChip({ code }: { code: string }) {
  const cls = CURRENCY_COLORS[code] ?? "bg-muted text-muted-foreground";
  return (
    <span className={`inline-flex items-center rounded px-2 py-0.5 text-xs font-bold tracking-wide ${cls}`}>
      {code}
    </span>
  );
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function formatRate(rate: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 6 }).format(rate);
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
  const [syncing, setSyncing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newlyAddedId, setNewlyAddedId] = useState<string | null>(null);
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

  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  useEffect(() => {
    return () => {
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
    };
  }, []);

  const filteredRates = useMemo(() => {
    const term = search.trim().toUpperCase();
    if (!term) return rates;
    return rates.filter((r) =>
      [r.fromCurrency, r.toCurrency, r.source, r.notes ?? ""].join(" ").toUpperCase().includes(term)
    );
  }, [rates, search]);

  // Latest rate per pair for the Rate Board
  const latestByPair = useMemo(() => {
    const map = new Map<string, ExchangeRate>();
    for (const r of rates) {
      const key = `${r.fromCurrency}-${r.toCurrency}`;
      const existing = map.get(key);
      if (!existing || r.effectiveDate > existing.effectiveDate) map.set(key, r);
    }
    return Array.from(map.values()).sort((a, b) =>
      `${a.fromCurrency}-${a.toCurrency}`.localeCompare(`${b.fromCurrency}-${b.toCurrency}`)
    );
  }, [rates]);

  const activePair = useMemo(
    () => rates.find((r) => r.fromCurrency === form.fromCurrency && r.toCurrency === form.toCurrency),
    [form.fromCurrency, form.toCurrency, rates]
  );

  const uniquePairs = useMemo(
    () => new Set(rates.map((r) => `${r.fromCurrency}-${r.toCurrency}`)).size,
    [rates]
  );
  const marketRateCount = useMemo(() => rates.filter((r) => r.source === "MARKET").length, [rates]);

  async function handleSync(base = "USD") {
    setSyncing(true);
    try {
      const res = await fetch("/api/finance/exchange-rates/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ base }),
      });
      const payload = await res.json();
      if (!res.ok) { toast.error(payload.error ?? "Sync failed"); return; }
      toast.success(payload.data?.message ?? "Rates synced");
      fetchRates(true);
    } catch {
      toast.error("Network error during sync");
    } finally {
      setSyncing(false);
    }
  }

  function updateForm<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function swapPair() {
    setForm((prev) => ({ ...prev, fromCurrency: prev.toCurrency, toCurrency: prev.fromCurrency }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const rate = Number(form.rate);
    if (form.fromCurrency === form.toCurrency) { toast.error("Choose two different currencies"); return; }
    if (!Number.isFinite(rate) || rate <= 0) { toast.error("Enter a valid positive rate"); return; }

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
      if (!response.ok) { toast.error(payload.error ?? "Failed to add exchange rate"); return; }

      const newRecord: ExchangeRate = payload.data ?? payload;
      toast.success("Exchange rate added");

      // Optimistic insert — prepend without clearing the list or resetting filters
      setRates((prev) => [newRecord, ...prev]);
      setNewlyAddedId(newRecord.id);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setNewlyAddedId(null), 3000);

      // Keep the currency pair and source so the user can add the next date's rate easily
      setForm((prev) => ({ ...prev, rate: "", notes: "" }));

      // Silent background sync to reconcile server state
      fetchRates(false);
    } catch {
      toast.error("Network error while adding rate");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(rate: ExchangeRate) {
    if (!window.confirm(`Delete ${rate.fromCurrency} → ${rate.toCurrency} at ${formatRate(rate.rate)}?`)) return;

    setDeletingId(rate.id);
    try {
      const response = await fetch(`/api/finance/exchange-rates/${rate.id}`, { method: "DELETE" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) { toast.error(payload.error ?? "Failed to delete exchange rate"); return; }

      toast.success("Exchange rate deleted");
      setRates((prev) => prev.filter((r) => r.id !== rate.id));
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
            <Button variant="outline" onClick={() => handleSync("USD")} disabled={syncing}>
              <Wifi className={syncing ? "h-4 w-4 animate-pulse" : "h-4 w-4"} />
              {syncing ? "Syncing…" : "Sync Live Rates"}
            </Button>
            <Button variant="outline" onClick={() => fetchRates(true)} disabled={refreshing}>
              <RefreshCw className={refreshing ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            </Button>
          </div>
        }
      />

      {/* Stats */}
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

      {/* Rate Board */}
      {latestByPair.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <LayoutGrid className="h-4 w-4 text-primary" />
              Rate Board
            </CardTitle>
            <CardDescription>Latest saved rate per currency pair.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {latestByPair.map((pair) => (
                <div
                  key={`${pair.fromCurrency}-${pair.toCurrency}`}
                  className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3"
                >
                  <div className="flex items-center gap-2">
                    <CurrencyChip code={pair.fromCurrency} />
                    <ArrowRightLeft className="h-3 w-3 text-muted-foreground" />
                    <CurrencyChip code={pair.toCurrency} />
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold tabular-nums">{formatRate(pair.rate)}</div>
                    <div className="text-xs text-muted-foreground">{formatDate(pair.effectiveDate)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Add Rate + Register */}
      <section className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Plus className="h-4 w-4 text-primary" />
              Add Rate
            </CardTitle>
            <CardDescription>Enter one unit of the source currency in the target currency.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
                <div className="space-y-1.5">
                  <Label>From</Label>
                  <Select value={form.fromCurrency} onValueChange={(v) => updateForm("fromCurrency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button type="button" variant="outline" size="icon" onClick={swapPair}>
                  <ArrowRightLeft className="h-4 w-4" />
                </Button>
                <div className="space-y-1.5">
                  <Label>To</Label>
                  <Select value={form.toCurrency} onValueChange={(v) => updateForm("toCurrency", v)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {activePair && (
                <div className="rounded-md border bg-muted/50 p-3 text-sm">
                  <div className="font-medium">Latest saved rate for this pair</div>
                  <div className="mt-1 text-muted-foreground">
                    1 {activePair.fromCurrency} = {formatRate(activePair.rate)} {activePair.toCurrency}
                    {" "}· {formatDate(activePair.effectiveDate)}
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
                    onChange={(e) => updateForm("rate", e.target.value)}
                    placeholder="2600.00"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Effective Date</Label>
                  <Input
                    type="date"
                    value={form.effectiveDate}
                    onChange={(e) => updateForm("effectiveDate", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => updateForm("source", v)}>
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
                  onChange={(e) => updateForm("notes", e.target.value)}
                  placeholder="Optional reference or source note"
                />
              </div>

              <Button type="submit" disabled={submitting} className="w-full">
                {submitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
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
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search"
                  />
                </div>
                <Select value={filterFrom} onValueChange={setFilterFrom}>
                  <SelectTrigger><SelectValue placeholder="From" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All from</SelectItem>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterTo} onValueChange={setFilterTo}>
                  <SelectTrigger><SelectValue placeholder="To" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All to</SelectItem>
                    {CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                      <tr
                        key={rate.id}
                        className={`border-b transition-colors duration-300 ${
                          newlyAddedId === rate.id
                            ? "bg-emerald-50 dark:bg-emerald-950/20"
                            : "hover:bg-muted/30"
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <CurrencyChip code={rate.fromCurrency} />
                            <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                            <CurrencyChip code={rate.toCurrency} />
                          </div>
                          <div className="mt-0.5 text-xs text-muted-foreground">
                            1 {rate.fromCurrency} in {rate.toCurrency}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-right font-semibold tabular-nums">{formatRate(rate.rate)}</td>
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
                            {deletingId === rate.id
                              ? <RefreshCw className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4 text-destructive" />
                            }
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
