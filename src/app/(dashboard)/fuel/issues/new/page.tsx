"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { useCurrency } from "@/hooks/useCurrency";
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

interface TankOption {
  id: string;
  name: string;
  fuelType: string;
  currentLevel: number;
  minLevel: number;
  capacity: number;
}

interface VehicleOption {
  id: string;
  plateNumber: string;
  make?: string | null;
  model?: string | null;
}

interface DriverOption {
  id: string;
  firstName: string;
  lastName: string;
}

interface FormData {
  tankId: string;
  vehicleId: string;
  driverId: string;
  tripRef: string;
  quantity: string;
  pricePerLiter: string;
  odometerReading: string;
  notes: string;
}

const DEFAULT: FormData = {
  tankId: "",
  vehicleId: "",
  driverId: "",
  tripRef: "",
  quantity: "",
  pricePerLiter: "",
  odometerReading: "",
  notes: "",
};

export default function NewIssuePage() {
  const currency = useCurrency();
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [tanks, setTanks] = useState<TankOption[]>([]);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);
  const [loadingPrice, setLoadingPrice] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch("/api/fuel-tanks?pageSize=200&status=ACTIVE").then((r) => r.json()),
      fetch("/api/vehicles?pageSize=200").then((r) => r.json()),
      fetch("/api/drivers?pageSize=200").then((r) => r.json()),
    ])
      .then(([tanksData, vehiclesData, driversData]) => {
        setTanks(tanksData.data ?? []);
        setVehicles(vehiclesData.data ?? []);
        setDrivers(driversData.data ?? []);
      })
      .catch(() => {});
  }, []);

  // Auto-fetch current price when tank changes
  useEffect(() => {
    const selectedTank = tanks.find((t) => t.id === form.tankId);
    if (!selectedTank) return;
    setLoadingPrice(true);
    fetch(`/api/fuel-prices/current?fuelType=${selectedTank.fuelType}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.data?.pricePerLiter) {
          setForm((prev) => ({ ...prev, pricePerLiter: String(d.data.pricePerLiter) }));
        }
      })
      .catch(() => {})
      .finally(() => setLoadingPrice(false));
  }, [form.tankId, tanks]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  const qty = parseFloat(form.quantity) || 0;
  const price = parseFloat(form.pricePerLiter) || 0;
  const totalCost = qty * price;

  const selectedTank = tanks.find((t) => t.id === form.tankId);
  const levelAfterIssue = selectedTank ? selectedTank.currentLevel - qty : null;
  const belowMin = selectedTank && levelAfterIssue !== null && levelAfterIssue < selectedTank.minLevel;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.tankId || !form.vehicleId || !form.quantity) {
      toast.error("Tank, vehicle, and quantity are required");
      return;
    }
    if (qty <= 0) {
      toast.error("Quantity must be greater than 0");
      return;
    }
    if (selectedTank && qty > selectedTank.currentLevel) {
      toast.error("Quantity exceeds available tank level");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankId: form.tankId,
          vehicleId: form.vehicleId,
          driverId: form.driverId || undefined,
          tripId: form.tripRef || undefined,
          quantityLiters: qty,
          pricePerLiter: price || undefined,
          totalCost: totalCost || undefined,
          odometerReading: parseFloat(form.odometerReading) || undefined,
          notes: form.notes || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to issue fuel"); return; }
      toast.success("Fuel issued successfully");
      router.push(`/fuel/issues/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Issue Fuel"
        description="Record a fuel issue to a vehicle"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/issues">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Issue Details</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <Label>Tank <span className="text-destructive">*</span></Label>
                <Select
                  value={form.tankId || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, tankId: v === "__none" ? "" : v, pricePerLiter: "" }))}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select tank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select a tank...</SelectItem>
                    {tanks.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} — {t.fuelType} ({t.currentLevel.toLocaleString()} L available)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Vehicle <span className="text-destructive">*</span></Label>
                <Select
                  value={form.vehicleId || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, vehicleId: v === "__none" ? "" : v }))}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select vehicle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select a vehicle...</SelectItem>
                    {vehicles.map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.plateNumber}{v.make ? ` — ${v.make}${v.model ? ` ${v.model}` : ""}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label>Driver</Label>
                <Select
                  value={form.driverId || "__none"}
                  onValueChange={(v) => setForm((p) => ({ ...p, driverId: v === "__none" ? "" : v }))}
                  disabled={submitting}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select driver (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {drivers.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.firstName} {d.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="tripRef">Trip Reference</Label>
                <Input
                  id="tripRef"
                  name="tripRef"
                  value={form.tripRef}
                  onChange={handleChange}
                  placeholder="Optional trip reference"
                  disabled={submitting}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label htmlFor="quantity">Quantity (L) <span className="text-destructive">*</span></Label>
                  <Input
                    id="quantity"
                    name="quantity"
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.quantity}
                    onChange={handleChange}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="pricePerLiter">
                    Price per Liter
                    {loadingPrice && <span className="text-xs text-muted-foreground ml-2">(loading...)</span>}
                  </Label>
                  <Input
                    id="pricePerLiter"
                    name="pricePerLiter"
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.pricePerLiter}
                    onChange={handleChange}
                    disabled={submitting}
                    placeholder="Auto-filled from price list"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="odometerReading">Odometer Reading (km)</Label>
                <Input
                  id="odometerReading"
                  name="odometerReading"
                  type="number"
                  min="0"
                  step="1"
                  value={form.odometerReading}
                  onChange={handleChange}
                  placeholder="Optional odometer reading"
                  disabled={submitting}
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="notes">Notes</Label>
                <textarea
                  id="notes"
                  name="notes"
                  value={form.notes}
                  onChange={handleChange}
                  rows={3}
                  disabled={submitting}
                  placeholder="Optional notes..."
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting && <LoadingSpinner className="mr-2" />}
                  Issue Fuel
                </Button>
                <Button variant="outline" type="button" asChild>
                  <Link href="/fuel/issues">Cancel</Link>
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {/* Cost summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Cost Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Quantity</span>
                <span>{qty > 0 ? `${qty.toLocaleString()} L` : "—"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Price / L</span>
                <span>{price > 0 ? `${currency} ${price.toFixed(3)}` : "—"}</span>
              </div>
              <div className="border-t pt-3 flex justify-between font-semibold">
                <span>Total Cost</span>
                <span className="text-lg">
                  {totalCost > 0
                    ? `${currency} ${totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                    : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Tank level preview */}
          {selectedTank && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Tank Level After Issue</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Current Level</span>
                  <span>{selectedTank.currentLevel.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Issuing</span>
                  <span className="text-red-600">-{qty > 0 ? qty.toLocaleString() : 0} L</span>
                </div>
                {qty > 0 && levelAfterIssue !== null && (
                  <>
                    <div className={`flex justify-between font-semibold border-t pt-3 ${belowMin ? "text-amber-600" : ""}`}>
                      <span>Level After</span>
                      <span>{Math.max(levelAfterIssue, 0).toLocaleString()} L</span>
                    </div>
                    {belowMin && (
                      <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs text-amber-700">
                        Warning: This will take the tank below the minimum level ({selectedTank.minLevel.toLocaleString()} L)
                      </div>
                    )}
                    {levelAfterIssue < 0 && (
                      <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                        Error: Quantity exceeds available fuel
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
