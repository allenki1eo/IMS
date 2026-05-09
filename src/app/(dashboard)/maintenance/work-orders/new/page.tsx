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

interface ScheduleOption {
  id: string;
  maintenanceType: string;
  vehicle?: { plateNumber: string } | null;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
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

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "CRITICAL", label: "Critical" },
];

interface FormData {
  vehicleId: string;
  scheduleId: string;
  maintenanceType: string;
  description: string;
  priority: string;
  assignedToId: string;
  estimatedCost: string;
}

const DEFAULT: FormData = {
  vehicleId: "",
  scheduleId: "",
  maintenanceType: "OIL_CHANGE",
  description: "",
  priority: "MEDIUM",
  assignedToId: "",
  estimatedCost: "",
};

export default function NewWorkOrderPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [vehicles, setVehicles] = useState<VehicleOption[]>([]);
  const [schedules, setSchedules] = useState<ScheduleOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/vehicles?pageSize=200").then((r) => r.json()),
      fetch("/api/maintenance/schedules?pageSize=200").then((r) => r.json()),
      fetch("/api/employees?pageSize=200").then((r) => r.json()),
    ])
      .then(([vehiclesData, schedulesData, employeesData]) => {
        setVehicles(vehiclesData.data ?? []);
        setSchedules(schedulesData.data ?? []);
        setEmployees(employeesData.data ?? []);
      })
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
      const res = await fetch("/api/maintenance/work-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vehicleId: form.vehicleId,
          scheduleId: form.scheduleId || undefined,
          maintenanceType: form.maintenanceType,
          description: form.description || undefined,
          priority: form.priority,
          assignedToId: form.assignedToId || undefined,
          estimatedCost: form.estimatedCost ? parseFloat(form.estimatedCost) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create work order"); return; }
      toast.success("Work order created successfully");
      router.push(`/maintenance/work-orders/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Work Order"
        description="Create a maintenance work order"
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance/work-orders">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Work Order Details</CardTitle>
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
              <Label>Schedule (optional)</Label>
              <Select
                value={form.scheduleId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, scheduleId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Link to schedule" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No schedule</SelectItem>
                  {schedules.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.maintenanceType.replace(/_/g, " ")}
                      {s.vehicle ? ` — ${s.vehicle.plateNumber}` : ""}
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
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                placeholder="Describe the maintenance work required..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm((p) => ({ ...p, priority: v }))}
                  disabled={submitting}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="estimatedCost">Estimated Cost</Label>
                <Input
                  id="estimatedCost"
                  name="estimatedCost"
                  type="number"
                  min="0"
                  step="0.01"
                  value={form.estimatedCost}
                  onChange={handleChange}
                  placeholder="e.g. 250.00"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Assigned To (optional)</Label>
              <Select
                value={form.assignedToId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedToId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Work Order
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/maintenance/work-orders">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
