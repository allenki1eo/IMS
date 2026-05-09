"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

interface AdjustmentLine {
  id: string;
  systemQty: number;
  countedQty: number;
  item: { code: string; name: string };
  location?: { name: string } | null;
}

interface Adjustment {
  id: string;
  reference: string;
  reason: string;
  status: string;
  notes: string | null;
  createdAt: string;
  warehouse?: { name: string } | null;
  lines: AdjustmentLine[];
}

const REASON_LABELS: Record<string, string> = {
  CYCLE_COUNT: "Cycle Count",
  DAMAGE: "Damage",
  EXPIRY: "Expiry",
  FOUND: "Found",
  OTHER: "Other",
};

export default function AdjustmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [adjustment, setAdjustment] = useState<Adjustment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const fetchAdjustment = useCallback(async () => {
    try {
      const res = await fetch(`/api/stock-adjustments/${id}`);
      const json = await res.json();
      setAdjustment(json.data ?? json);
    } catch {
      toast.error("Failed to load adjustment");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchAdjustment(); }, [fetchAdjustment]);

  async function performAction(action: "submit" | "apply") {
    setActioning(true);
    try {
      const endpoint =
        action === "submit"
          ? `/api/stock-adjustments/${id}/submit`
          : `/api/stock-adjustments/${id}/apply`;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action}`); return; }
      toast.success(
        action === "submit"
          ? "Adjustment submitted for approval"
          : "Adjustment applied — stock levels updated"
      );
      fetchAdjustment();
    } catch {
      toast.error("Network error");
    } finally {
      setActioning(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!adjustment) return <div className="text-muted-foreground">Adjustment not found.</div>;

  return (
    <div>
      <PageHeader
        title={adjustment.reference}
        description={`Stock Adjustment — ${adjustment.warehouse?.name ?? "Unknown warehouse"}`}
        actions={
          <div className="flex gap-2">
            {adjustment.status === "DRAFT" && (
              <Button onClick={() => performAction("submit")} disabled={actioning}>
                {actioning ? (
                  <LoadingSpinner className="mr-2" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                Submit for Approval
              </Button>
            )}
            {adjustment.status === "SUBMITTED" && (
              <PermissionGuard require="warehouse:adjustment:approve">
                <Button onClick={() => performAction("apply")} disabled={actioning}>
                  {actioning ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Apply Adjustment
                </Button>
              </PermissionGuard>
            )}
            <Button variant="outline" asChild>
              <Link href="/warehouse/adjustments">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Summary cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <StatusBadge status={adjustment.status} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="text-sm font-medium">
              {format(new Date(adjustment.createdAt), "dd MMM yyyy")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Warehouse</p>
            <p className="text-sm font-medium">{adjustment.warehouse?.name ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Reason</p>
            <Badge variant="secondary">
              {REASON_LABELS[adjustment.reason] ?? adjustment.reason}
            </Badge>
          </CardContent>
        </Card>
      </div>

      {adjustment.notes && (
        <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md">
          {adjustment.notes}
        </p>
      )}

      {/* Lines */}
      <h2 className="text-lg font-semibold mb-3">Line Items</h2>
      {adjustment.lines.length === 0 ? (
        <p className="text-muted-foreground text-sm">No line items.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">System Qty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Counted Qty</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Difference</th>
              </tr>
            </thead>
            <tbody>
              {adjustment.lines.map((line) => {
                const diff = line.countedQty - line.systemQty;
                return (
                  <tr key={line.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-medium">{line.item.name}</span>
                      <br />
                      <code className="text-xs text-muted-foreground">{line.item.code}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.location?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {line.systemQty}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {line.countedQty}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-bold ${
                        diff === 0
                          ? "text-muted-foreground"
                          : diff > 0
                          ? "text-green-600"
                          : "text-red-600"
                      }`}
                    >
                      {diff > 0 ? "+" : ""}{diff}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Action banners */}
      {adjustment.status === "DRAFT" && (
        <>
          <Separator className="my-6" />
          <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800">Ready to submit?</p>
              <p className="text-xs text-amber-700">
                Submitting will send this adjustment for management approval.
              </p>
            </div>
            <Button onClick={() => performAction("submit")} disabled={actioning}>
              {actioning && <LoadingSpinner className="mr-2" />}
              Submit for Approval
            </Button>
          </div>
        </>
      )}

      {adjustment.status === "SUBMITTED" && (
        <>
          <Separator className="my-6" />
          <PermissionGuard require="warehouse:adjustment:approve">
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Approve and apply?</p>
                <p className="text-xs text-green-700">
                  Applying this adjustment will update actual stock levels and cannot be undone.
                </p>
              </div>
              <Button onClick={() => performAction("apply")} disabled={actioning}>
                {actioning && <LoadingSpinner className="mr-2" />}
                Apply Adjustment
              </Button>
            </div>
          </PermissionGuard>
        </>
      )}
    </div>
  );
}
