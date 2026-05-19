"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Receipt {
  id: string;
  reference: string;
  tank?: { id: string; name: string; currentLevel: number; capacity: number } | null;
  supplierName: string | null;
  deliveryNoteRef: string | null;
  quantity: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  currency: string;
  exchangeRate: number | null;
  baseCurrencyAmount: number | null;
  status: string;
  notes: string | null;
  createdAt: string;
  createdBy?: { fullName: string } | null;
}

export default function ReceiptDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const loadReceipt = useCallback(() => {
    setLoading(true);
    fetch(`/api/fuel-receipts/${id}`)
      .then((r) => r.json())
      .then((d) => setReceipt(d.data))
      .catch(() => toast.error("Failed to load receipt"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadReceipt(); }, [loadReceipt]);

  async function handleConfirm() {
    setConfirming(true);
    try {
      const res = await fetch(`/api/fuel-receipts/${id}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to confirm receipt"); return; }
      toast.success("Receipt confirmed — tank level updated");
      setShowConfirmDialog(false);
      loadReceipt();
    } catch {
      toast.error("Network error");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!receipt) return <div className="text-muted-foreground">Receipt not found.</div>;

  const newLevel = receipt.tank
    ? Math.min(receipt.tank.currentLevel + receipt.quantity, receipt.tank.capacity)
    : null;

  return (
    <div>
      <PageHeader
        title={receipt.reference}
        description="Fuel Receipt"
        actions={
          <div className="flex gap-2">
            {receipt.status === "DRAFT" && (
              <PermissionGuard require="fuel:receipt:confirm">
                <Button onClick={() => setShowConfirmDialog(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Receipt
                </Button>
              </PermissionGuard>
            )}
            <Button variant="outline" asChild>
              <Link href="/fuel/receipts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Receipt Details</CardTitle>
            <StatusBadge status={receipt.status} />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Reference</p>
                <code className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{receipt.reference}</code>
              </div>
              <div>
                <p className="text-muted-foreground">Tank</p>
                <p className="font-medium">
                  {receipt.tank ? (
                    <Link href={`/fuel/tanks/${receipt.tank.id}`} className="hover:underline">
                      {receipt.tank.name}
                    </Link>
                  ) : "—"}
                </p>
                {receipt.tank && (
                  <p className="text-xs text-muted-foreground">
                    Current: {receipt.tank.currentLevel.toLocaleString()} / {receipt.tank.capacity.toLocaleString()} L
                  </p>
                )}
              </div>
              <div>
                <p className="text-muted-foreground">Supplier</p>
                <p className="font-medium">{receipt.supplierName ?? "—"}</p>
              </div>
              <div>
                <p className="text-muted-foreground">Delivery Note Ref</p>
                <p className="font-medium">{receipt.deliveryNoteRef ?? "—"}</p>
              </div>
            </div>

            <Separator />

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">Quantity</p>
                <p className="text-lg font-bold">{receipt.quantity.toLocaleString()} L</p>
              </div>
              <div>
                <p className="text-muted-foreground">Price / Liter</p>
                <p className="text-lg font-bold">
                  {receipt.pricePerLiter != null ? receipt.pricePerLiter.toLocaleString(undefined, { style: "currency", currency: receipt.currency || "TZS" }) : "—"}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">Total Cost</p>
                <p className="text-lg font-bold">
                  {receipt.totalCost != null
                    ? receipt.totalCost.toLocaleString(undefined, { style: "currency", currency: receipt.currency || "TZS" })
                    : "—"}
                </p>
                {receipt.currency && receipt.currency !== "TZS" && receipt.baseCurrencyAmount != null && (
                  <p className="text-xs text-muted-foreground">
                    ≈ {receipt.baseCurrencyAmount.toLocaleString(undefined, { style: "currency", currency: "TZS" })} @ {receipt.exchangeRate}
                  </p>
                )}
              </div>
            </div>

            {receipt.notes && (
              <>
                <Separator />
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Notes</p>
                  <p className="text-sm">{receipt.notes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Metadata</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <div>
                <p className="text-muted-foreground">Created At</p>
                <p className="font-medium">{format(new Date(receipt.createdAt), "dd MMM yyyy HH:mm")}</p>
              </div>
              {receipt.createdBy && (
                <div>
                  <p className="text-muted-foreground">Created By</p>
                  <p className="font-medium">{receipt.createdBy.fullName}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Confirm Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Receipt</DialogTitle>
            <DialogDescription>
              This will mark the receipt as confirmed and update the tank level.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tank</span>
              <span className="font-medium">{receipt.tank?.name ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Quantity to Add</span>
              <span className="font-medium text-green-600">+{receipt.quantity.toLocaleString()} L</span>
            </div>
            {receipt.tank && (
              <>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Level</span>
                  <span>{receipt.tank.currentLevel.toLocaleString()} L</span>
                </div>
                <div className="flex justify-between border-t pt-3 font-semibold">
                  <span>New Level</span>
                  <span className="text-green-600">{newLevel?.toLocaleString()} L</span>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} disabled={confirming}>
              Cancel
            </Button>
            <Button onClick={handleConfirm} disabled={confirming}>
              {confirming && <LoadingSpinner className="mr-2" />}
              Confirm Receipt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
