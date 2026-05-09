"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
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
import { formatLiters } from "../../_components/fuel-ui";

interface Tank {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  currentLevel: number;
  capacity: number;
}

interface Vehicle {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
  odometer?: number;
}

interface Driver {
  id: string;
  employee?: { fullName: string; employeeNumber?: string } | null;
}

export default function NewFuelIssuePage() {
  const router = useRouter();
  const [tanks, setTanks] = useState<Tank[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    tankId: "",
    vehicleId: "",
    driverId: "",
    quantityLiters: "",
    pricePerLiter: "",
    odometerReading: "",
    notes: "",
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/fuel-tanks?isActive=true").then((res) => res.json()),
      fetch("/api/vehicles?status=ACTIVE&pageSize=200").then((res) => res.json()),
      fetch("/api/drivers?status=ACTIVE&pageSize=200").then((res) => res.json()),
    ])
      .then(([tanksJson, vehiclesJson, driversJson]) => {
        setTanks(tanksJson.data ?? []);
        setVehicles(vehiclesJson.data ?? []);
        setDrivers(driversJson.data ?? []);
      })
      .catch(() => toast.error("Failed to load issue form data"));
  }, []);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.tankId) { toast.error("Tank is required"); return; }
    if (!form.vehicleId) { toast.error("Vehicle is required"); return; }
    if (!form.quantityLiters || Number(form.quantityLiters) <= 0) { toast.error("Quantity must be greater than zero"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/fuel-issues", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tankId: form.tankId,
          vehicleId: form.vehicleId,
          driverId: form.driverId || undefined,
          quantityLiters: Number(form.quantityLiters),
          pricePerLiter: form.pricePerLiter ? Number(form.pricePerLiter) : undefined,
          odometerReading: form.odometerReading ? Number(form.odometerReading) : undefined,
          notes: form.notes.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to issue fuel"); return; }
      toast.success("Fuel issued");
      router.push(`/fuel/issues/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedTank = tanks.find((tank) => tank.id === form.tankId);

  return (
    <div>
      <PageHeader
        title="Issue Fuel"
        description="Deduct fuel from a tank and assign it to a vehicle"
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/issues">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-3xl">
        <CardHeader><CardTitle className="text-base">Issue Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Tank <span className="text-destructive">*</span></Label>
                <Select value={form.tankId || "__none"} onValueChange={(value) => set("tankId", value === "__none" ? "" : value)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select tank" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select tank</SelectItem>
                    {tanks.map((tank) => (
                      <SelectItem key={tank.id} value={tank.id}>
                        {tank.name} ({tank.code}) - {formatLiters(tank.currentLevel)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedTank && (
                  <p className="text-xs text-muted-foreground">
                    Available: {formatLiters(selectedTank.currentLevel)} of {formatLiters(selectedTank.capacity)}
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <Label>Vehicle <span className="text-destructive">*</span></Label>
                <Select value={form.vehicleId || "__none"} onValueChange={(value) => set("vehicleId", value === "__none" ? "" : value)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">Select vehicle</SelectItem>
                    {vehicles.map((vehicle) => (
                      <SelectItem key={vehicle.id} value={vehicle.id}>
                        {vehicle.plateNumber} - {vehicle.make} {vehicle.model}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Driver</Label>
                <Select value={form.driverId || "__none"} onValueChange={(value) => set("driverId", value === "__none" ? "" : value)} disabled={submitting}>
                  <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none">None</SelectItem>
                    {drivers.map((driver) => (
                      <SelectItem key={driver.id} value={driver.id}>
                        {driver.employee?.fullName ?? driver.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="quantityLiters">Quantity (liters) <span className="text-destructive">*</span></Label>
                <Input id="quantityLiters" type="number" min="0" step="0.01" value={form.quantityLiters} onChange={(e) => set("quantityLiters", e.target.value)} disabled={submitting} placeholder="100" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="pricePerLiter">Price / Liter</Label>
                <Input id="pricePerLiter" type="number" min="0" step="0.01" value={form.pricePerLiter} onChange={(e) => set("pricePerLiter", e.target.value)} disabled={submitting} placeholder="0.00" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="odometerReading">Odometer</Label>
                <Input id="odometerReading" type="number" min="0" value={form.odometerReading} onChange={(e) => set("odometerReading", e.target.value)} disabled={submitting} placeholder="0" />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input id="notes" value={form.notes} onChange={(e) => set("notes", e.target.value)} disabled={submitting} placeholder="Optional notes" />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Issue Fuel
              </Button>
              <Button type="button" variant="outline" asChild>
                <Link href="/fuel/issues">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

