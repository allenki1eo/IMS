"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, FlaskConical, AlertTriangle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, qty } from "../../_components/production-ui";

interface Batch {
  id: string;
  reference: string;
  batchType: string;
  productName: string;
  productCode?: string | null;
  plannedQty: number;
  actualQty?: number | null;
  uom: string;
  status: string;
  plannedStart?: string | null;
  plannedEnd?: string | null;
  startedAt?: string | null;
  completedAt?: string | null;
  notes?: string | null;
  line?: { id: string; code: string; name: string } | null;
  recipe?: { id: string; code: string; name: string } | null;
  materials: Array<{ id: string; itemCode?: string | null; description: string; plannedQty: number; issuedQty: number; uom: string }>;
}

export default function ProductionBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<"start" | "cancel" | null>(null);
  const [showComplete, setShowComplete] = useState(false);
  const [actualQty, setActualQty] = useState("");

  const loadBatch = useCallback(() => {
    setLoading(true);
    fetch(`/api/production/batches/${id}`)
      .then((r) => r.json())
      .then((d) => {
        const data = d.data ?? null;
        setBatch(data);
        if (data) setActualQty(String(data.actualQty ?? data.plannedQty ?? ""));
      })
      .catch(() => toast.error("Failed to load batch"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadBatch(); }, [loadBatch]);

  async function runAction(action: "start" | "cancel") {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/production/batches/${id}/${action}`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action} batch`); return; }
      toast.success(`Batch ${action === "start" ? "started" : "cancelled"}`);
      setConfirmAction(null);
      loadBatch();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  async function completeBatch(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/production/batches/${id}/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actualQty: actualQty ? Number(actualQty) : undefined }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to complete batch"); return; }
      toast.success("Batch completed");
      setShowComplete(false);
      loadBatch();
    } catch {
      toast.error("Network error");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!batch) return <div className="text-muted-foreground">Production batch not found.</div>;

  return (
    <div>
      <PageHeader title={batch.reference} description={batch.productName} actions={<Button variant="outline" asChild><Link href="/production/batches"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link></Button>} />
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Batch Info</CardTitle></CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={batch.status} /></div></div>
            <div><p className="text-muted-foreground">Type</p><p className="mt-1">{batch.batchType.replace(/_/g, " ")}</p></div>
            <div><p className="text-muted-foreground">Line</p><p className="mt-1">{batch.line ? <Link href={`/production/lines/${batch.line.id}`} className="hover:underline">{batch.line.code} - {batch.line.name}</Link> : "-"}</p></div>
            <div><p className="text-muted-foreground">Recipe</p><p className="mt-1">{batch.recipe ? <Link href={`/production/recipes/${batch.recipe.id}`} className="hover:underline">{batch.recipe.code} - {batch.recipe.name}</Link> : "-"}</p></div>
            <div><p className="text-muted-foreground">Planned Qty</p><p className="mt-1">{qty(batch.plannedQty, batch.uom)}</p></div>
            <div><p className="text-muted-foreground">Actual Qty</p><p className="mt-1">{batch.actualQty == null ? "-" : qty(batch.actualQty, batch.uom)}</p></div>
            <div><p className="text-muted-foreground">Planned Start</p><p className="mt-1">{formatDate(batch.plannedStart)}</p></div>
            <div><p className="text-muted-foreground">Planned End</p><p className="mt-1">{formatDate(batch.plannedEnd)}</p></div>
            <div><p className="text-muted-foreground">Started</p><p className="mt-1">{formatDate(batch.startedAt)}</p></div>
            <div><p className="text-muted-foreground">Completed</p><p className="mt-1">{formatDate(batch.completedAt)}</p></div>
            {batch.notes && <div className="sm:col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{batch.notes}</p></div>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-base">Actions</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {batch.status === "PLANNED" && <PermissionGuard require="production:batch:start"><Button className="w-full" onClick={() => setConfirmAction("start")}>Start Batch</Button></PermissionGuard>}
            {batch.status === "IN_PROGRESS" && <PermissionGuard require="production:batch:complete"><Button className="w-full" onClick={() => setShowComplete(true)}>Complete Batch</Button></PermissionGuard>}
            {["PLANNED", "IN_PROGRESS"].includes(batch.status) && <PermissionGuard require="production:batch:update"><Button className="w-full" variant="destructive" onClick={() => setConfirmAction("cancel")}>Cancel Batch</Button></PermissionGuard>}
            {!["PLANNED", "IN_PROGRESS"].includes(batch.status) && <p className="text-sm text-muted-foreground">No actions available for this status.</p>}
            {batch.status === "COMPLETED" && (
              <PermissionGuard require="qc:test:create">
                <Button className="w-full" variant="outline" asChild>
                  <Link href={`/qc/tests/new?batchId=${batch.id}&batchRef=${encodeURIComponent(batch.reference)}`}>
                    <FlaskConical className="h-4 w-4 mr-2" />
                    Create QC Test
                  </Link>
                </Button>
              </PermissionGuard>
            )}
          </CardContent>
        </Card>
      </div>
      {showComplete && (
        <Card className="max-w-md mb-6">
          <CardHeader><CardTitle className="text-base">Complete Batch</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={completeBatch} className="space-y-4">
              <div className="space-y-1"><label className="text-sm font-medium">Actual Quantity</label><Input type="number" min="0" step="0.01" value={actualQty} onChange={(e) => setActualQty(e.target.value)} disabled={actionLoading} /></div>
              <div className="flex gap-2"><Button type="submit" disabled={actionLoading}>{actionLoading && <LoadingSpinner className="mr-2" />}Complete</Button><Button type="button" variant="outline" onClick={() => setShowComplete(false)} disabled={actionLoading}>Cancel</Button></div>
            </form>
          </CardContent>
        </Card>
      )}
      {/* Material variance alert */}
      {batch.status === "COMPLETED" && batch.actualQty != null && batch.plannedQty > 0 && (() => {
        const variance = ((batch.actualQty - batch.plannedQty) / batch.plannedQty) * 100;
        if (Math.abs(variance) < 5) return null;
        return (
          <div className={`flex items-start gap-3 p-4 rounded-lg border mb-4 ${variance < 0 ? "border-red-200 bg-red-50 text-red-800" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
            <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold">
                {variance < 0 ? "Below target" : "Above target"}: {Math.abs(variance).toFixed(1)}% variance
              </p>
              <p className="text-xs mt-0.5 opacity-80">
                Planned {batch.plannedQty} {batch.uom} · Actual {batch.actualQty} {batch.uom}. Review materials and adjust future batch planning.
              </p>
            </div>
          </div>
        );
      })()}

      <Card>
        <CardHeader><CardTitle className="text-base">Batch Materials</CardTitle></CardHeader>
        <CardContent className="p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Planned</th><th className="px-4 py-3 text-left font-medium text-muted-foreground">Issued</th></tr></thead><tbody>{batch.materials.length === 0 ? <tr><td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No materials captured for this batch</td></tr> : batch.materials.map((line) => <tr key={line.id} className="border-t hover:bg-muted/30"><td className="px-4 py-3">{line.description}</td><td className="px-4 py-3">{line.itemCode ? <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{line.itemCode}</code> : "-"}</td><td className="px-4 py-3">{qty(line.plannedQty, line.uom)}</td><td className="px-4 py-3">{qty(line.issuedQty, line.uom)}</td></tr>)}</tbody></table></div></CardContent>
      </Card>
      <ConfirmDialog open={confirmAction != null} onOpenChange={(open) => !open && setConfirmAction(null)} title={confirmAction === "start" ? "Start Batch" : "Cancel Batch"} description="This will update the production batch status." confirmLabel={confirmAction === "start" ? "Start" : "Cancel Batch"} variant={confirmAction === "cancel" ? "destructive" : "default"} loading={actionLoading} onConfirm={() => confirmAction && runAction(confirmAction)} />
    </div>
  );
}

