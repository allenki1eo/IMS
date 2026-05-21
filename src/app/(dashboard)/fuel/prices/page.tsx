"use client";
import { useState, useEffect, useCallback } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus } from "lucide-react";
import { useCurrentUser } from "@/hooks/useCurrentUser";

const FUEL_TYPES = ["DIESEL", "PETROL", "PETROL_95", "PETROL_93", "ELECTRIC"];

interface FuelPrice {
  id: string;
  fuelType: string;
  pricePerLiter: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
  createdAt: string;
}

const defaultForm = {
  fuelType: "DIESEL",
  pricePerLiter: "",
  effectiveFrom: new Date().toISOString().slice(0, 10),
  effectiveTo: "",
  notes: "",
};

export default function FuelPricesPage() {
  const [prices, setPrices] = useState<FuelPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(defaultForm);
  const [submitting, setSubmitting] = useState(false);
  const { user } = useCurrentUser();
  const currency = user?.companies?.[0]?.currency ?? "TZS";

  const fetchPrices = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterType !== "all") params.set("fuelType", filterType);
      const res = await fetch(`/api/fuel-prices?${params}`);
      const json = await res.json();
      setPrices(json.data ?? json);
    } catch { toast.error("Failed to load fuel prices"); }
    finally { setLoading(false); }
  }, [filterType]);

  useEffect(() => { fetchPrices(); }, [fetchPrices]);

  const currentPrices = FUEL_TYPES.map((ft) => {
    const active = prices.find(
      (p) => p.fuelType === ft && (!p.effectiveTo || new Date(p.effectiveTo) > new Date())
    );
    return { fuelType: ft, price: active };
  }).filter((x) => x.price);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.pricePerLiter) { toast.error("Price per liter is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fuelType: form.fuelType,
          pricePerLiter: parseFloat(form.pricePerLiter),
          effectiveFrom: new Date(form.effectiveFrom).toISOString(),
          effectiveTo: form.effectiveTo ? new Date(form.effectiveTo).toISOString() : undefined,
          notes: form.notes || undefined,
        }),
      });
      if (!res.ok) { const j = await res.json(); throw new Error(j.error ?? "Failed"); }
      toast.success("Fuel price recorded");
      setOpen(false);
      setForm(defaultForm);
      fetchPrices();
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to record price"); }
    finally { setSubmitting(false); }
  }

  const columns = [
    { key: "fuelType", header: "Fuel Type", cell: (r: FuelPrice) => <Badge variant="outline">{r.fuelType.replace(/_/g, " ")}</Badge> },
    { key: "pricePerLiter", header: "Price / L", cell: (r: FuelPrice) => <span className="font-semibold">{currency} {r.pricePerLiter.toFixed(3)}</span> },
    { key: "effectiveFrom", header: "Effective From", cell: (r: FuelPrice) => format(new Date(r.effectiveFrom), "dd MMM yyyy") },
    { key: "effectiveTo", header: "Effective To", cell: (r: FuelPrice) => r.effectiveTo ? format(new Date(r.effectiveTo), "dd MMM yyyy") : <span className="text-muted-foreground">—</span> },
    { key: "notes", header: "Notes", cell: (r: FuelPrice) => <span className="text-sm text-muted-foreground">{r.notes ?? "—"}</span> },
    {
      key: "current",
      header: "Status",
      cell: (r: FuelPrice) => {
        const now = new Date();
        const from = new Date(r.effectiveFrom);
        const to = r.effectiveTo ? new Date(r.effectiveTo) : null;
        const isCurrent = from <= now && (!to || to > now);
        return isCurrent ? <Badge className="bg-green-100 text-green-800 border-green-200">Current</Badge> : <Badge variant="outline" className="text-muted-foreground">Historical</Badge>;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Fuel Prices"
        description="Track fuel price history by type"
        actions={
          <PermissionGuard require="fuel:price:create">
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button><Plus className="h-4 w-4 mr-2" />Record Price</Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Record Fuel Price</DialogTitle></DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4 mt-2">
                  <div className="space-y-1">
                    <Label>Fuel Type *</Label>
                    <Select value={form.fuelType} onValueChange={(v) => setForm((p) => ({ ...p, fuelType: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Price per Liter *</Label>
                    <Input type="number" min="0" step="0.001" value={form.pricePerLiter} onChange={(e) => setForm((p) => ({ ...p, pricePerLiter: e.target.value }))} placeholder="0.000" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label>Effective From *</Label>
                      <Input type="date" value={form.effectiveFrom} onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))} />
                    </div>
                    <div className="space-y-1">
                      <Label>Effective To</Label>
                      <Input type="date" value={form.effectiveTo} onChange={(e) => setForm((p) => ({ ...p, effectiveTo: e.target.value }))} />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>Notes</Label>
                    <Input value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
                  </div>
                  <div className="flex gap-2 justify-end pt-2">
                    <Button variant="outline" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                    <Button type="submit" disabled={submitting}>Record Price</Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </PermissionGuard>
        }
      />

      {currentPrices.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          {currentPrices.map(({ fuelType, price }) => (
            <Card key={fuelType}>
              <CardHeader className="pb-1"><CardTitle className="text-xs text-muted-foreground">{fuelType.replace(/_/g, " ")}</CardTitle></CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">{currency} {price!.pricePerLiter.toFixed(3)}</p>
                <p className="text-xs text-muted-foreground mt-1">per liter</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <div className="mb-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-44"><SelectValue placeholder="All fuel types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All fuel types</SelectItem>
            {FUEL_TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={prices}
        loading={loading}
        emptyTitle="No prices recorded"
        emptyDescription="Record your first fuel price to get started."
      />
    </div>
  );
}
