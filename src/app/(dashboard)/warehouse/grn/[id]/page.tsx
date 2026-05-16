"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { PrintButton } from "@/components/shared/PrintButton";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface GRNLine {
  id: string;
  quantity: number;
  unitCost: number | null;
  item: { code: string; name: string };
  location?: { name: string } | null;
}

interface GRN {
  id: string;
  reference: string;
  status: string;
  supplierName: string | null;
  supplierRef: string | null;
  notes: string | null;
  createdAt: string;
  warehouse?: { name: string } | null;
  lines: GRNLine[];
}

export default function GRNDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [grn, setGrn] = useState<GRN | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  const fetchGRN = useCallback(async () => {
    try {
      const res = await fetch(`/api/grns/${id}`);
      const json = await res.json();
      setGrn(json.data ?? json);
    } catch {
      toast.error("Failed to load GRN");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchGRN(); }, [fetchGRN]);

  async function confirmReceipt() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/grns/${id}/confirm`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to confirm GRN"); return; }
      toast.success("GRN confirmed — stock updated");
      fetchGRN();
    } catch {
      toast.error("Network error");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!grn) return <div className="text-muted-foreground">GRN not found.</div>;

  const totalValue = grn.lines.reduce(
    (sum, l) => sum + (l.unitCost ? l.quantity * l.unitCost : 0),
    0
  );

  return (
    <div>
      <PageHeader
        title={grn.reference}
        description={`Goods Received Note — ${grn.warehouse?.name ?? "Unknown warehouse"}`}
        actions={
          <div className="flex gap-2">
            {grn.status === "DRAFT" && (
              <PermissionGuard require="warehouse:grn:confirm">
                <Button onClick={confirmReceipt} disabled={confirming}>
                  {confirming ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <CheckCircle className="h-4 w-4 mr-2" />
                  )}
                  Confirm Receipt
                </Button>
              </PermissionGuard>
            )}
            <PrintButton className="no-print" />
            <Button variant="outline" asChild>
              <Link href="/warehouse/grn">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      {/* Header info */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Status</p>
            <StatusBadge status={grn.status} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="text-sm font-medium">
              {format(new Date(grn.createdAt), "dd MMM yyyy")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Supplier</p>
            <p className="text-sm font-medium">{grn.supplierName ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Supplier Ref</p>
            <p className="text-sm font-medium">{grn.supplierRef ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {grn.notes && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base">Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{grn.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Lines */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Line Items</h2>
        {grn.lines.length === 0 ? (
          <p className="text-muted-foreground text-sm">No line items.</p>
        ) : (
          <div className="rounded-md border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Location</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Unit Cost</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                </tr>
              </thead>
              <tbody>
                {grn.lines.map((line) => (
                  <tr key={line.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <span className="font-medium">{line.item.name}</span>
                      <br />
                      <code className="text-xs text-muted-foreground">{line.item.code}</code>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {line.location?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{line.quantity}</td>
                    <td className="px-4 py-3 text-right text-muted-foreground">
                      {line.unitCost != null ? line.unitCost.toFixed(2) : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {line.unitCost != null
                        ? (line.quantity * line.unitCost).toFixed(2)
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
              {totalValue > 0 && (
                <tfoot>
                  <tr className="border-t bg-muted/50">
                    <td colSpan={4} className="px-4 py-3 text-right font-medium text-muted-foreground">
                      Total Value
                    </td>
                    <td className="px-4 py-3 text-right font-bold">
                      {totalValue.toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {grn.status === "DRAFT" && (
        <>
          <Separator className="my-6" />
          <PermissionGuard require="warehouse:grn:confirm">
            <div className="flex items-center gap-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-800">Ready to confirm?</p>
                <p className="text-xs text-amber-700">
                  Confirming will update stock levels and cannot be undone.
                </p>
              </div>
              <Button onClick={confirmReceipt} disabled={confirming}>
                {confirming && <LoadingSpinner className="mr-2" />}
                Confirm Receipt
              </Button>
            </div>
          </PermissionGuard>
        </>
      )}
    </div>
  );
}
