"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
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

interface Schedule {
  id: string;
  maintenanceType: string;
  description?: string | null;
  intervalKm?: number | null;
  intervalDays?: number | null;
  nextDueAt?: string | null;
  nextDueOdometer?: number | null;
  status: string;
  vehicle?: { id: string; plateNumber: string; make?: string; model?: string } | null;
}

interface WorkOrderRow {
  id: string;
  reference: string;
  status: string;
  priority: string;
  createdAt: string;
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

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function priorityClass(priority: string): string {
  switch (priority) {
    case "CRITICAL": return "bg-red-100 text-red-700";
    case "HIGH": return "bg-orange-100 text-orange-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function ScheduleDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [schedule, setSchedule] = useState<Schedule | null>(null);
  const [workOrders, setWorkOrders] = useState<WorkOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    maintenanceType: "OIL_CHANGE",
    description: "",
    intervalKm: "",
    intervalDays: "",
    nextDueAt: "",
    nextDueOdometer: "",
    status: "ACTIVE",
  });

  const loadSchedule = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/maintenance/schedules/${id}`).then((r) => r.json()),
      fetch(`/api/maintenance/work-orders?scheduleId=${id}&pageSize=50`).then((r) => r.json()),
    ])
      .then(([scheduleData, workOrdersData]) => {
        const s: Schedule = scheduleData.data;
        setSchedule(s);
        if (s) {
          setForm({
            maintenanceType: s.maintenanceType,
            description: s.description ?? "",
            intervalKm: s.intervalKm != null ? String(s.intervalKm) : "",
            intervalDays: s.intervalDays != null ? String(s.intervalDays) : "",
            nextDueAt: s.nextDueAt ? s.nextDueAt.split("T")[0] : "",
            nextDueOdometer: s.nextDueOdometer != null ? String(s.nextDueOdometer) : "",
            status: s.status,
          });
        }
        setWorkOrders(workOrdersData.data ?? []);
      })
      .catch(() => toast.error("Failed to load schedule"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadSchedule(); }, [loadSchedule]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch(`/api/maintenance/schedules/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          maintenanceType: form.maintenanceType,
          description: form.description || undefined,
          intervalKm: form.intervalKm ? parseFloat(form.intervalKm) : undefined,
          intervalDays: form.intervalDays ? parseInt(form.intervalDays) : undefined,
          nextDueAt: form.nextDueAt || undefined,
          nextDueOdometer: form.nextDueOdometer ? parseFloat(form.nextDueOdometer) : undefined,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update schedule"); return; }
      setSchedule((prev) => prev ? { ...prev, ...json.data } : prev);
      toast.success("Schedule updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!schedule) return <div className="text-muted-foreground">Schedule not found.</div>;

  return (
    <div>
      <PageHeader
        title={`${schedule.maintenanceType.replace(/_/g, " ")} Schedule`}
        description={schedule.vehicle ? `Vehicle: ${schedule.vehicle.plateNumber}` : ""}
        actions={
          <Button variant="outline" asChild>
            <Link href="/maintenance/schedules">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            {schedule.vehicle && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Vehicle</span>
                <span className="font-medium">{schedule.vehicle.plateNumber}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Type</span>
              <span>{schedule.maintenanceType.replace(/_/g, " ")}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={schedule.status} />
            </div>
            {schedule.intervalKm && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interval (km)</span>
                <span>{schedule.intervalKm.toLocaleString()} km</span>
              </div>
            )}
            {schedule.intervalDays && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Interval (days)</span>
                <span>{schedule.intervalDays} days</span>
              </div>
            )}
            {schedule.nextDueAt && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Due Date</span>
                <span>{format(new Date(schedule.nextDueAt), "dd MMM yyyy")}</span>
              </div>
            )}
            {schedule.nextDueOdometer && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Next Due Odometer</span>
                <span>{schedule.nextDueOdometer.toLocaleString()} km</span>
              </div>
            )}
            {schedule.description && (
              <div className="pt-2 border-t">
                <p className="text-muted-foreground text-xs mb-1">Description</p>
                <p>{schedule.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit form */}
        <PermissionGuard require="maintenance:schedule:update">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Edit Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-1">
                  <Label>Maintenance Type</Label>
                  <Select
                    value={form.maintenanceType}
                    onValueChange={(v) => setForm((p) => ({ ...p, maintenanceType: v }))}
                    disabled={saving}
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
                    disabled={saving}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="intervalKm">Interval (km)</Label>
                    <Input
                      id="intervalKm"
                      name="intervalKm"
                      type="number"
                      min="0"
                      value={form.intervalKm}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="intervalDays">Interval (days)</Label>
                    <Input
                      id="intervalDays"
                      name="intervalDays"
                      type="number"
                      min="0"
                      value={form.intervalDays}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="nextDueAt">Next Due Date</Label>
                    <Input
                      id="nextDueAt"
                      name="nextDueAt"
                      type="date"
                      value={form.nextDueAt}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="nextDueOdometer">Next Due Odometer (km)</Label>
                    <Input
                      id="nextDueOdometer"
                      name="nextDueOdometer"
                      type="number"
                      min="0"
                      value={form.nextDueOdometer}
                      onChange={handleChange}
                      disabled={saving}
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select
                    value={form.status}
                    onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
                    disabled={saving}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button type="submit" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Linked Work Orders */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-base">Linked Work Orders</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {workOrders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No work orders linked to this schedule
                    </td>
                  </tr>
                ) : (
                  workOrders.map((wo) => (
                    <tr key={wo.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-medium">{wo.reference}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(wo.priority)}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={wo.status} />
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {format(new Date(wo.createdAt), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/maintenance/work-orders/${wo.id}`}>View</Link>
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
    </div>
  );
}
