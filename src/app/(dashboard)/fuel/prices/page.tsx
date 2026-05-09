"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FUEL_TYPES, formatDate, formatMoney } from "../_components/fuel-ui";

interface PriceRow {
  id: string;
  fuelType: string;
  pricePerLiter: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  notes: string | null;
}

export default function FuelPricesPage() {
  const [prices, setPrices] = useState<PriceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [fuelTypeFilter, setFuelTypeFilter] = useState("ALL");
  const [form, setForm] = useState({
    fuelType: "DIESEL",
    pricePerLiter: "",
    effectiveFrom: new Date().toISOString().slice(0, 10),
    effectiveTo: "",
    notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (fuelTypeFilter !== "ALL") params.set("fuelType", fuelTypeFilter);
    try {
      const res = await fetch(`/api/fuel-prices?${params}`);
      const json = await res.json();
      setPrices(json.data ?? []);
    } catch {
      toast.error("Failed to load fuel prices");
    } finally {
      setLoading(false);
    }
  }, [fuelTypeFilter]);

  useEffect(() => {
    load();
  }, [load]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.pricePerLiter || Number(form.pricePerLiter) <= 0) { toast.error("Price must be greater than zero"); return; }
    if (!form.effectiveFrom) { toast.error("Effective date is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-prices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fuelType: form.fuelType,
          pricePerLiter: Number(form.pricePerLiter),
          effectiveFrom: form.effectiveFrom,
          effectiveTo: form.effectiveTo || undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to record price"); return; }
      toast.success("Fuel price recorded");
      setForm((prev) => ({ ...prev, pricePerLiter: "", notes: "" }));
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "fuelType",
      header: "Fuel Type",
      cell: (row: PriceRow) => <span className="font-medium">{row.fuelType}</span>,
    },
    {
      key: "price",
      header: "Price / Liter",
      cell: (row: PriceRow) => <span className="font-semibold">{formatMoney(row.pricePerLiter)}</span>,
    },
    {
      key: "effectiveFrom",
      header: "Effective From",
      cell: (row: PriceRow) => <span className="text-sm text-muted-foreground">{formatDate(row.effectiveFrom)}</span>,
    },
    {
      key: "effectiveTo",
      header: "Effective To",
      cell: (row: PriceRow) => <span className="text-sm text-muted-foreground">{formatDate(row.effectiveTo)}</span>,
    },
    {
      key: "notes",
      header: "Notes",
      cell: (row: PriceRow) => <span className="text-sm text-muted-foreground">{row.notes ?? "-"}</span>,
    },
  ];

  return (
    <div>
      <PageHeader title="Fuel Prices" description="Record effective fuel price history for costing receipts and issues" />

      <PermissionGuard require="fuel:price:create">
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Record Price</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="grid gap-4 lg:grid-cols-6">
              <div className="space-y-1 lg:col-span-1">
                <Label>Fuel Type</Label>
                <Select value={form.fuelType} onValueChange={(value) => set("fuelType", value)} disabled={submitting}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FUEL_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="pricePerLiter">Price / Liter</Label>
                <Input id="pricePerLiter" type="number" min="0" step="0.01" value={form.pricePerLiter} onChange={(e) => set("pricePerLiter", e.target.value)} disabled={submitting} />
              </div>
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="effectiveFrom">From</Label>
                <Input id="effectiveFrom" type="date" value={form.effectiveFrom} onChange={(e) => set("effectiveFrom", e.target.value)} disabled={submitting} />
              </div>
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="effectiveTo">To</Label>
                <Input id="effectiveTo" type="date" value={form.effectiveTo} onChange={(e) => set("effectiveTo", e.target.value)} disabled={submitting} />
              </div>
              <div className="space-y-1 lg:col-span-1">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={submitting} />
              </div>
              <div className="flex items-end lg:col-span-1">
                <Button type="submit" disabled={submitting} className="w-full">
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Record
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </PermissionGuard>

      <div className="flex gap-3 mb-4 flex-wrap">
        <Select value={fuelTypeFilter} onValueChange={setFuelTypeFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Fuel</SelectItem>
            {FUEL_TYPES.map((type) => (
              <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={prices}
        loading={loading}
        emptyTitle="No fuel prices found"
        emptyDescription="Record the first price for a fuel type."
      />
    </div>
  );
}

