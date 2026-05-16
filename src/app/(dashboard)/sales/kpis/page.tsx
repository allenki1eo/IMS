"use client";

import { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { format } from "date-fns";
import { RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface KPI {
  id: string;
  period: string;
  metric: string;
  target: number;
  achieved: number;
  currency: string;
  syncedAt: string;
}

interface WebhookLog {
  id: string;
  eventType: string;
  externalId?: string | null;
  status: string;
  error?: string | null;
  processedAt: string;
}

const METRIC_LABELS: Record<string, string> = {
  REVENUE: "Revenue",
  ORDERS: "Orders Count",
  NEW_CUSTOMERS: "New Customers",
  AVG_ORDER_VALUE: "Avg Order Value",
};

function formatValue(metric: string, value: number, currency: string) {
  if (metric === "ORDERS" || metric === "NEW_CUSTOMERS") {
    return value.toLocaleString();
  }
  return `${currency} ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function getCurrentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function SalesKpisPage() {
  const [kpis, setKpis] = useState<KPI[]>([]);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(true);
  const [period, setPeriod] = useState(getCurrentPeriod());
  const [editKpi, setEditKpi] = useState<KPI | null>(null);
  const [editTarget, setEditTarget] = useState("");
  const [saving, setSaving] = useState(false);

  const loadKpis = useCallback(() => {
    setLoading(true);
    fetch(`/api/sales/kpis?period=${period}`)
      .then((r) => r.json())
      .then((d) => setKpis(d.data ?? []))
      .catch(() => toast.error("Failed to load KPIs"))
      .finally(() => setLoading(false));
  }, [period]);

  const loadLogs = useCallback(() => {
    setLogsLoading(true);
    fetch("/api/sales/webhook-logs")
      .then((r) => r.json())
      .then((d) => setLogs((d.data ?? []).slice(0, 20)))
      .catch(() => {}) // non-fatal — user may not have permission
      .finally(() => setLogsLoading(false));
  }, []);

  useEffect(() => { loadKpis(); }, [loadKpis]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  async function handleSaveTarget() {
    if (!editKpi) return;
    setSaving(true);
    try {
      const res = await fetch("/api/sales/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period: editKpi.period,
          metric: editKpi.metric,
          target: Number(editTarget),
          achieved: editKpi.achieved,
          currency: editKpi.currency,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save target"); return; }
      toast.success("Target updated");
      setEditKpi(null);
      loadKpis();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddMetric(metric: string) {
    try {
      const res = await fetch("/api/sales/kpis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          period,
          metric,
          target: 0,
          achieved: 0,
          currency: "TZS",
        }),
      });
      if (!res.ok) { toast.error("Failed to add metric"); return; }
      toast.success("Metric added");
      loadKpis();
    } catch {
      toast.error("Network error");
    }
  }

  const missingMetrics = Object.keys(METRIC_LABELS).filter(
    (m) => !kpis.some((k) => k.metric === m)
  );

  return (
    <div>
      <PageHeader
        title="KPIs & Targets"
        description="Sales performance targets and webhook integration logs"
        actions={
          <Button variant="outline" size="sm" onClick={loadKpis}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        }
      />

      {/* Period Picker */}
      <div className="flex items-center gap-3 mb-6">
        <Label>Period</Label>
        <Input
          type="month"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          className="w-44"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
            {kpis.map((kpi) => {
              const progress = kpi.target > 0 ? Math.min(100, Math.round((kpi.achieved / kpi.target) * 100)) : 0;
              return (
                <Card key={kpi.id}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className="text-sm">{METRIC_LABELS[kpi.metric] ?? kpi.metric}</CardTitle>
                    <PermissionGuard require="sales:kpi:manage">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => { setEditKpi(kpi); setEditTarget(String(kpi.target)); }}
                      >
                        Edit
                      </Button>
                    </PermissionGuard>
                  </CardHeader>
                  <CardContent>
                    <div className="mb-3">
                      <p className="text-2xl font-bold">
                        {formatValue(kpi.metric, kpi.achieved, kpi.currency)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Target: {formatValue(kpi.metric, kpi.target, kpi.currency)}
                      </p>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden mb-1">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 70 ? "bg-blue-500" : "bg-orange-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{progress}% of target</p>
                  </CardContent>
                </Card>
              );
            })}

            {kpis.length === 0 && (
              <div className="sm:col-span-2 lg:col-span-4">
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No KPI targets set for {period}. Add metrics below or wait for webhook sync.
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* Add Missing Metrics */}
          <PermissionGuard require="sales:kpi:manage">
            {missingMetrics.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-6">
                <span className="text-sm text-muted-foreground self-center">Add metric:</span>
                {missingMetrics.map((m) => (
                  <Button key={m} variant="outline" size="sm" onClick={() => handleAddMetric(m)}>
                    + {METRIC_LABELS[m]}
                  </Button>
                ))}
              </div>
            )}
          </PermissionGuard>
        </>
      )}

      {/* Webhook Logs */}
      <PermissionGuard require="sales:webhook:manage">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Webhook Events</CardTitle>
            <Button variant="ghost" size="sm" onClick={loadLogs}>
              <RefreshCw className="h-4 w-4" />
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Event</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">External ID</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Error</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Processed</th>
                  </tr>
                </thead>
                <tbody>
                  {logsLoading ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-4 text-center text-muted-foreground">Loading...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No webhook events received yet
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{log.eventType}</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{log.externalId ?? "—"}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={log.status} />
                        </td>
                        <td className="px-4 py-3 text-destructive text-xs max-w-xs truncate">{log.error ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.processedAt), "dd MMM yyyy HH:mm")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </PermissionGuard>

      {/* Edit Target Dialog */}
      <Dialog open={editKpi !== null} onOpenChange={(open) => { if (!open) setEditKpi(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Target — {editKpi ? METRIC_LABELS[editKpi.metric] ?? editKpi.metric : ""}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Period</Label>
              <p className="text-sm text-muted-foreground">{editKpi?.period}</p>
            </div>
            <div className="space-y-1">
              <Label>Target Value</Label>
              <Input
                type="number"
                min="0"
                step="any"
                value={editTarget}
                onChange={(e) => setEditTarget(e.target.value)}
                placeholder="0"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditKpi(null)}>Cancel</Button>
              <Button onClick={handleSaveTarget} disabled={saving}>Save Target</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
