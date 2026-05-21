"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface VehicleOption {
  id: string;
  plateNumber: string;
  make: string;
  model: string;
}

interface DriverOption {
  id: string;
  firstName?: string | null;
  lastName?: string | null;
  employee?: {
    fullName: string;
  } | null;
}

interface CargoLine {
  key: string;
  description: string;
  quantity: string;
  uom: string;
}

function newCargoLine(): CargoLine {
  return { key: crypto.randomUUID(), description: "", quantity: "", uom: "" };
}

export default function NewTripPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [drivers, setDrivers] = useState<DriverOption[]>([]);

  const [form, setForm] = useState({
    vehicleId: "",
    trailerId: "",
    driverId: "",
    origin: "",
    destination: "",
    scheduledDeparture: "",
    scheduledArrival: "",
    priority: "NORMAL",
    cargoDescription: "",
    cargoWeight: "",
    notes: "",
  });
  const [cargoLines, setCargoLines] = useState<CargoLine[]>([]);

  function set(field: string, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  const [trailers, setTrailers] = useState<VehicleOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles?pageSize=200").then((r) => r.json()),
      fetch("/api/vehicles?vehicleType=TRAILER&pageSize=200").then((r) => r.json()),
      fetch("/api/drivers?pageSize=200").then((r) => r.json()),
    ])
      .then(([vJson, trJson, dJson]) => {
        const allVehicles: (VehicleOption & { vehicleType?: string })[] = vJson.data ?? [];
        setVehicles(allVehicles.filter((v) => v.vehicleType !== "TRAILER"));
        setTrailers(trJson.data ?? []);
        setDrivers(dJson.data ?? []);
      })
      .catch(() => toast.error("Failed to load options"));
  }, []);

  function updateCargoLine(key: string, field: keyof CargoLine, value: string) {
    setCargoLines((prev) => prev.map((l) => l.key === key ? { ...l, [field]: value } : l));
  }

  function removeCargoLine(key: string) {
    setCargoLines((prev) => prev.filter((l) => l.key !== key));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.origin.trim()) { toast.error("Origin is required"); return; }
    if (!form.destination.trim()) { toast.error("Destination is required"); return; }

    const validLines = cargoLines.filter((l) => l.description.trim());

    setSubmitting(true);
    try {
      const res = await fetch("/api/trips", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: form.vehicleId || undefined,
          trailerId: form.trailerId || undefined,
          driverId: form.driverId || undefined,
          origin: form.origin.trim(),
          destination: form.destination.trim(),
          scheduledDeparture: form.scheduledDeparture || undefined,
          scheduledArrival: form.scheduledArrival || undefined,
          priority: form.priority,
          cargoDescription: form.cargoDescription.trim() || undefined,
          cargoWeight: form.cargoWeight ? Number(form.cargoWeight) : undefined,
          notes: form.notes.trim() || undefined,
          cargoLines: validLines.length > 0
            ? validLines.map((l) => ({
                description: l.description.trim(),
                quantity: l.quantity ? Number(l.quantity) : undefined,
                uom: l.uom.trim() || undefined,
              }))
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create trip"); return; }
      toast.success("Trip created");
      router.push(`/transport/trips/${json.data?.id ?? json.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Trip"
        description="Create a new transport trip"
        actions={
          <Button variant="outline" asChild>
            <Link href="/transport/trips">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl">
        {/* Vehicle & Driver */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Vehicle & Driver</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Truck (Vehicle)</Label>
              <Select value={form.vehicleId || "__none"} onValueChange={(v) => set("vehicleId", v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select vehicle" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None / Unassigned</SelectItem>
                  {vehicles.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Trailer</Label>
              <Select value={form.trailerId || "__none"} onValueChange={(v) => set("trailerId", v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select trailer (optional)" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {trailers.map((v) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.plateNumber} — {v.make} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Driver</Label>
              <Select value={form.driverId || "__none"} onValueChange={(v) => set("driverId", v === "__none" ? "" : v)} disabled={submitting}>
                <SelectTrigger><SelectValue placeholder="Select driver" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None / Unassigned</SelectItem>
                  {drivers.map((d) => {
                    const name = d.employee?.fullName ??
                      ([d.firstName, d.lastName].filter(Boolean).join(" ") || d.id);
                    return (
                      <SelectItem key={d.id} value={d.id}>
                        {name}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Route */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Route & Schedule</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="origin">
                  Origin <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="origin"
                  value={form.origin}
                  onChange={(e) => set("origin", e.target.value)}
                  placeholder="e.g. Nairobi Depot"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="destination">
                  Destination <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="destination"
                  value={form.destination}
                  onChange={(e) => set("destination", e.target.value)}
                  placeholder="e.g. Mombasa Branch"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="scheduledDeparture">Scheduled Departure</Label>
                <Input
                  id="scheduledDeparture"
                  type="datetime-local"
                  value={form.scheduledDeparture}
                  onChange={(e) => set("scheduledDeparture", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="scheduledArrival">Scheduled Arrival</Label>
                <Input
                  id="scheduledArrival"
                  type="datetime-local"
                  value={form.scheduledArrival}
                  onChange={(e) => set("scheduledArrival", e.target.value)}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select value={form.priority} onValueChange={(v) => set("priority", v)} disabled={submitting}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NORMAL">Normal</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Cargo Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="cargoDescription">Cargo Description</Label>
                <Input
                  id="cargoDescription"
                  value={form.cargoDescription}
                  onChange={(e) => set("cargoDescription", e.target.value)}
                  placeholder="General description of cargo"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="cargoWeight">Cargo Weight (tons)</Label>
                <Input
                  id="cargoWeight"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.cargoWeight}
                  onChange={(e) => set("cargoWeight", e.target.value)}
                  placeholder="0.00"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="Optional notes"
                  disabled={submitting}
                />
              </div>
            </div>

            {/* Dynamic cargo lines */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Cargo Lines (optional)</p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setCargoLines((p) => [...p, newCargoLine()])}
                  disabled={submitting}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add Line
                </Button>
              </div>
              <div className="space-y-3">
                {cargoLines.map((line, idx) => (
                  <div key={line.key}>
                    {idx > 0 && <Separator className="mb-3" />}
                    <div className="grid grid-cols-12 gap-3 items-end">
                      <div className="space-y-1 col-span-5">
                        <Label className="text-xs">Description <span className="text-destructive">*</span></Label>
                        <Input
                          value={line.description}
                          onChange={(e) => updateCargoLine(line.key, "description", e.target.value)}
                          placeholder="Item description"
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1 col-span-3">
                        <Label className="text-xs">Quantity</Label>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={line.quantity}
                          onChange={(e) => updateCargoLine(line.key, "quantity", e.target.value)}
                          placeholder="0"
                          disabled={submitting}
                        />
                      </div>
                      <div className="space-y-1 col-span-3">
                        <Label className="text-xs">UOM</Label>
                        <Input
                          value={line.uom}
                          onChange={(e) => updateCargoLine(line.key, "uom", e.target.value)}
                          placeholder="e.g. kg, pcs"
                          disabled={submitting}
                        />
                      </div>
                      <div className="col-span-1 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeCargoLine(line.key)}
                          disabled={submitting}
                          className="text-destructive hover:text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create Trip
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/transport/trips">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
