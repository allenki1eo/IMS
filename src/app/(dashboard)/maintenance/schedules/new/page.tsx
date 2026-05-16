"use client";

import { useState, useEffect } from "react";
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

interface VehicleOption {
  id: string;
  plateNumber: string;
  make?: string;
  model?: string;
}

const MAINTENANCE_TYPES = [
  { value: "OIL_CHANGE", label: "Oil Change" },
  { value: "TIRE_ROTATION", label: "Tire Rotation" },
  { value: "BRAKE_INSPECTION", label: "Brake Inspection" },
  { value: "ENGINE_SERVICE", label: "Engine Service" },
  { value: "TRANSMISSION_SERVICE", label: "Transmission Service" },
  { value: "AIR_FILTER", label: "Air Filter" },
  { value: "FUEL_FILTER", label: "Fuel Filter" },
  { value: "COOLANT_FLUSH", label: "Coolant Flush" },
  { value: "GENERAL_INSPECTION", label: "General Inspection" },
  { value: "OTHER", label: "Other" },
];

interface FormData {
  vehicleId: string;
  maintenanceType: string;
  description: string;
  intervalKm: string;
  intervalDays: string;
  nextDueAt: string;
  nextDueOdometer: string;
}

const DEFAULT: FormData = {
  vehicleId: "",
  maintenanceType: "OIL_CHANGE",
  description: "",
  intervalKm: "",
  intervalDays: "",
  nextDueAt: "",
  nextDueOdometer: "",
};

export default function NewSchedulePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);

  useEffect(() => {
    fetch("/api/vehicles?pageSize=200")
      .then((r) => r.json())
      .then((d) => setVehicles(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.vehicleId || !form.maintenanceType) {
      toast.error("Vehicle and maintenance type are required");
      return;
    }

    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        vehicleId: form.vehicleId,
        maintenanceType: form.maintenanceType,
        description: form.description || undefined,
        intervalKm: form.intervalKm ? parseFloat(form.intervalKm) : undefined,
        intervalDays: form.intervalDays ? parseInt(form.intervalDays) : undefined,
        nextDueAt: form.nextDueAt || undefined,
        nextDueOdometer: form.nextDueOdometer ? parseFloat(form.nextDueOdometer) : undefined,
      };

      const res = await fetch("/api/maintenance/schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create schedule"); return; }
      toast.success("Schedule created successfully");
      router.push("/maintenance/schedules");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Maintenance Schedule"
        description="Create a new preventive maintenance schedule"
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance/schedules">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Schedule Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
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
                      {v.plateNumber}{v.make ? ` — ${v.make} ${v.model ?? ""}`.trim() : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Maintenance Type <span className="text-destructive">*</span></Label>
              <Select
                value={form.maintenanceType}
                onValueChange={(v) => setForm((p) => ({ ...p, maintenanceType: v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAINTENANCE_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Optional details about this schedule..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="intervalKm">Interval (km)</Label>
                <Input
                  id="intervalKm"
                  name="intervalKm"
                  type="number"
                  min="0"
                  step="1"
                  value={form.intervalKm}
                  onChange={handleChange}
                  placeholder="e.g. 5000"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="intervalDays">Interval (days)</Label>
                <Input
                  id="intervalDays"
                  name="intervalDays"
                  type="number"
                  min="0"
                  step="1"
                  value={form.intervalDays}
                  onChange={handleChange}
                  placeholder="e.g. 90"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="nextDueAt">Next Due Date</Label>
                <Input
                  id="nextDueAt"
                  name="nextDueAt"
                  type="date"
                  value={form.nextDueAt}
                  onChange={handleChange}
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="nextDueOdometer">Next Due Odometer (km)</Label>
                <Input
                  id="nextDueOdometer"
                  name="nextDueOdometer"
                  type="number"
                  min="0"
                  step="1"
                  value={form.nextDueOdometer}
                  onChange={handleChange}
                  placeholder="e.g. 150000"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Schedule
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/maintenance/schedules">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
