"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, TrendingUp, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Tank {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  status: string;
  notes: string | null;
  branch?: { id: string; name: string } | null;
}

interface HistoryEntry {
  id: string;
  date: string;
  type: "RECEIPT" | "ISSUE";
  reference: string;
  quantity: number;
  runningBalance: number;
  notes: string | null;
}

const FUEL_TYPES = [
  { value: "DIESEL", label: "Diesel" },
  { value: "PETROL", label: "Petrol" },
  { value: "PETROL_95", label: "Petrol 95" },
  { value: "PETROL_93", label: "Petrol 93" },
  { value: "ELECTRIC", label: "Electric" },
];

const STATUSES = [
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
];

function fillColor(pct: number): string {
  if (pct > 50) return "#22c55e";
  if (pct > 25) return "#f59e0b";
  return "#ef4444";
}

export default function TankDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [tank, setTank] = useState<Tank | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"details" | "history">("details");
  const [saving, setSaving] = useState(false);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const [form, setForm] = useState({
    name: "",
    code: "",
    fuelType: "DIESEL",
    capacity: "",
    minLevel: "",
    notes: "",
    status: "ACTIVE",
  });

  const loadTank = useCallback(() => {
    setLoading(true);
    fetch(`/api/fuel-tanks/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const t: Tank = d.data;
        setTank(t);
        if (t) {
          setForm({
            name: t.name,
            code: t.code,
            fuelType: t.fuelType,
            capacity: String(t.capacity),
            minLevel: String(t.minLevel),
            notes: t.notes ?? "",
            status: t.status,
          });
        }
      })
      .catch(() => toast.error("Failed to load tank"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadTank(); }, [loadTank]);

  useEffect(() => {
    if (activeTab === "history") {
      setHistoryLoading(true);
      fetch(`/api/fuel/tank-history/${id}`)
        .then((r) => r.json())
        .then((d) => setHistory(d.data ?? []))
        .catch(() => toast.error("Failed to load history"))
        .finally(() => setHistoryLoading(false));
    }
  }, [activeTab, id]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.capacity) {
      toast.error("Name and capacity are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/fuel-tanks/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          fuelType: form.fuelType,
          capacity: parseFloat(form.capacity),
          minLevel: parseFloat(form.minLevel) || 0,
          notes: form.notes || undefined,
          status: form.status,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update tank"); return; }
      setTank((prev) => prev ? { ...prev, ...json.data } : prev);
      toast.success("Tank updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!tank) return <div className="text-muted-foreground">Tank not found.</div>;

  const fillPct = tank.capacity > 0 ? (tank.currentLevel / tank.capacity) * 100 : 0;
  const color = fillColor(fillPct);

  return (
    <div>
      <PageHeader
        title={tank.name}
        description={tank.code}
        actions={
          <Button variant="outline" asChild>
            <Link href="/fuel/tanks">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      {/* Tabs */}
      <div className="flex border-b mb-6 gap-1">
        {(["details", "history"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors -mb-px ${
              activeTab === tab
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "details" && (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Fill level visual */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Current Level</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center">
                <p className="text-3xl font-bold" style={{ color }}>
                  {fillPct.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  {tank.currentLevel.toLocaleString()} / {tank.capacity.toLocaleString()} L
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-4">
                <div
                  className="h-4 rounded-full transition-all"
                  style={{ width: `${Math.min(fillPct, 100)}%`, backgroundColor: color }}
                />
              </div>
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Min: {tank.minLevel.toLocaleString()} L</span>
                <span>Capacity: {tank.capacity.toLocaleString()} L</span>
              </div>
              {tank.currentLevel < tank.minLevel && (
                <div className="rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-sm text-amber-700">
                  Below minimum level
                </div>
              )}
              <div className="flex items-center gap-2">
                <StatusBadge status={tank.status} />
                <Badge variant="outline">{tank.fuelType.replace(/_/g, " ")}</Badge>
              </div>
            </CardContent>
          </Card>

          {/* Edit form */}
          <PermissionGuard require="fuel:tank:update">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Tank Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                      <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="code">Code</Label>
                      <Input id="code" name="code" value={form.code} disabled />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Fuel Type</Label>
                    <Select value={form.fuelType} onValueChange={(v) => setForm((p) => ({ ...p, fuelType: v }))} disabled={saving}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {FUEL_TYPES.map((t) => (
                          <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <Label htmlFor="capacity">Capacity (L) <span className="text-destructive">*</span></Label>
                      <Input id="capacity" name="capacity" type="number" min="0" step="0.01" value={form.capacity} onChange={handleChange} disabled={saving} />
                    </div>
                    <div className="space-y-1">
                      <Label htmlFor="minLevel">Min Level (L)</Label>
                      <Input id="minLevel" name="minLevel" type="number" min="0" step="0.01" value={form.minLevel} onChange={handleChange} disabled={saving} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))} disabled={saving}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {STATUSES.map((s) => (
                          <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-1">
                    <Label htmlFor="notes">Notes</Label>
                    <textarea
                      id="notes"
                      name="notes"
                      value={form.notes}
                      onChange={handleChange}
                      rows={3}
                      disabled={saving}
                      className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                    />
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
      )}

      {activeTab === "history" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction History</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {historyLoading ? (
              <LoadingState />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Quantity (L)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Balance (L)</th>
                      <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No history found</td>
                      </tr>
                    ) : (
                      history.map((entry) => (
                        <tr key={entry.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                            {format(new Date(entry.date), "dd MMM yyyy HH:mm")}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold ${entry.type === "RECEIPT" ? "text-green-600" : "text-red-600"}`}>
                              {entry.type === "RECEIPT" ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                              {entry.type}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{entry.reference}</code>
                          </td>
                          <td className="px-4 py-3">
                            <span className={entry.type === "RECEIPT" ? "text-green-600 font-medium" : "text-red-600 font-medium"}>
                              {entry.type === "RECEIPT" ? "+" : "-"}{entry.quantity.toLocaleString()}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium">{entry.runningBalance.toLocaleString()}</td>
                          <td className="px-4 py-3 text-muted-foreground">{entry.notes ?? "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
