"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { TrendingDown, Trash2, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface ExchangeRate {
  id: string;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  source: string;
  effectiveDate: string;
  notes: string | null;
}

const CURRENCIES = ["TZS", "USD", "EUR", "GBP"];

export default function ExchangeRatesPage() {
  const [rates, setRates] = useState<ExchangeRate[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    fromCurrency: "USD",
    toCurrency: "TZS",
    rate: "",
    source: "MANUAL",
    effectiveDate: new Date().toISOString().split("T")[0],
    notes: "",
  });

  const fetchRates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/finance/exchange-rates?pageSize=200");
      const json = await res.json();
      setRates(json.data ?? []);
    } catch {
      toast.error("Failed to load exchange rates");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRates();
  }, [fetchRates]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.rate || isNaN(Number(form.rate))) {
      toast.error("Valid rate is required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/exchange-rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromCurrency: form.fromCurrency,
          toCurrency: form.toCurrency,
          rate: Number(form.rate),
          source: form.source,
          effectiveDate: form.effectiveDate,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create rate"); return; }
      toast.success("Exchange rate added");
      setForm((p) => ({ ...p, rate: "", notes: "" }));
      fetchRates();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this exchange rate?")) return;
    try {
      const res = await fetch(`/api/finance/exchange-rates/${id}`, { method: "DELETE" });
      if (!res.ok) { toast.error("Failed to delete"); return; }
      toast.success("Exchange rate deleted");
      fetchRates();
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Exchange Rates" description="Manage currency conversion rates" />

      <Card className="mb-6 max-w-2xl">
        <CardHeader><CardTitle className="text-base">Add Exchange Rate</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-1">
                <Label>From</Label>
                <Select value={form.fromCurrency} onValueChange={(v) => setForm((p) => ({ ...p, fromCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>To</Label>
                <Select value={form.toCurrency} onValueChange={(v) => setForm((p) => ({ ...p, toCurrency: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{CURRENCIES.map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Rate</Label>
                <Input type="number" step="0.01" value={form.rate} onChange={(e) => setForm((p) => ({ ...p, rate: e.target.value }))} placeholder="e.g. 2600" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label>Source</Label>
                <Select value={form.source} onValueChange={(v) => setForm((p) => ({ ...p, source: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MANUAL">Manual</SelectItem>
                    <SelectItem value="MARKET">Market</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Effective Date</Label>
                <Input type="date" value={form.effectiveDate} onChange={(e) => setForm((p) => ({ ...p, effectiveDate: e.target.value }))} />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional" />
            </div>
            <Button type="submit" disabled={submitting}><Plus className="h-4 w-4 mr-2" />Add Rate</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Exchange Rates</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">From</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">To</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Rate</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Source</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Effective</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground"></th>
                </tr>
              </thead>
              <tbody>
                {rates.length === 0 ? (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No exchange rates found</td></tr>
                ) : rates.map((r) => (
                  <tr key={r.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{r.fromCurrency}</td>
                    <td className="px-4 py-3">{r.toCurrency}</td>
                    <td className="px-4 py-3">{r.rate.toLocaleString()}</td>
                    <td className="px-4 py-3"><span className="text-xs bg-muted px-1.5 py-0.5 rounded">{r.source}</span></td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(r.effectiveDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{r.notes ?? "—"}</td>
                    <td className="px-4 py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleDelete(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
