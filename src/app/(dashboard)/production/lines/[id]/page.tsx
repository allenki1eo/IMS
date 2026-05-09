"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, qty } from "../../_components/production-ui";

interface ProductionLine {
  id: string;
  code: string;
  name: string;
  lineType: string;
  location?: string | null;
  capacityPerDay?: number | null;
  uom: string;
  status: string;
  batches?: Array<{ id: string; reference: string; productName: string; plannedQty: number; uom: string; status: string; plannedStart?: string | null }>;
}

export default function ProductionLineDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [line, setLine] = useState<ProductionLine | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const loadLine = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/lines/${id}`)
      .then((r) => r.json())
      .then((d) => setLine(d.data ?? null))
      .catch(() => toast.error("Failed to load production line"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadLine(); }, [loadLine]);

  async function toggleStatus() {
    if (!line) return;
    setActionLoading(true);
    const status = line.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const res = await fetch(`/api/production/lines/${id}/status`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update line"); return; }
      setLine((prev) => prev ? { ...prev, status: json.data.status } : prev);
      toast.success(`Line marked ${status.toLowerCase()}`);
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!line) return <div className="text-muted-foreground">Production line not found.</div>;

  return (
    <div>
      <PageHeader title={line.name} description={line.code} actions={<Button variant="outline" asChild><Link href="/production/lines"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Line Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={line.status} /></div></div>
            <div><p className="text-muted-foreground">Type</p><p className="mt-1">{line.lineType.replace(/_/g, " ")}</p></div>
            <div><p className="text-muted-foreground">Location</p><p className="mt-1">{line.location ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Capacity / Day</p><p className="mt-1">{line.capacityPerDay == null ? "-" : qty(line.capacityPerDay, line.uom)}</p></div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            <PermissionGuard require="production:line:update"><Button className="w-full" variant={line.status === "ACTIVE" ? "outline" : "default"} onClick={toggleStatus} disabled={actionLoading}>{actionLoading && <LoadingSpinner className="mr-2" />}Mark {line.status === "ACTIVE" ? "Inactive" : "Active"}</Button></PermissionGuard>
            <PermissionGuard require="production:batch:create"><Button className="w-full" variant="outline" asChild><Link href={`/production/batches/new?lineId=${line.id}`}>Plan Batch</Link></Button></PermissionGuard>
          </CardContent>
        </Card>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Recent Batches</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Qty</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th></tr></thead>
              <tbody>
                {!line.batches?.length ? <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No batches on this line</td></tr> : line.batches.map((batch) => (
                  <tr key={batch.id} className="border-t hover:bg-muted/30"><td className="px-4 py-3"><Link href={`/production/batches/${batch.id}`} className="font-medium hover:underline">{batch.reference}</Link></td><td className="px-4 py-3">{batch.productName}</td><td className="px-4 py-3"><StatusBadge status={batch.status} /></td><td className="px-4 py-3">{qty(batch.plannedQty, batch.uom)}</td><td className="px-4 py-3 text-muted-foreground">{formatDate(batch.plannedStart)}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

