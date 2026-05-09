"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatLiters, formatMoney } from "../../_components/fuel-ui";

interface Receipt {
  id: string;
  reference: string;
  supplierName: string | null;
  deliveryNoteRef: string | null;
  quantityLiters: number;
  pricePerLiter: number | null;
  totalCost: number | null;
  status: string;
  createdAt: string;
  confirmedAt: string | null;
  notes: string | null;
  tank?: {
    id: string;
    name: string;
    code: string;
    fuelType: string;
    capacity: number;
    currentLevel: number;
  } | null;
}

export default function FuelReceiptDetailPage() {
  const params = useParams<{ id: string }>();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fuel-receipts/${params.id}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to load receipt"); return; }
      setReceipt(json.data);
    } catch {
      toast.error("Failed to load receipt");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmReceipt() {
    if (!receipt) return;
    setConfirming(true);
    try {
      const res = await fetch(`/api/fuel-receipts/${receipt.id}/confirm`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to confirm receipt"); return; }
      toast.success("Fuel receipt confirmed");
      setConfirmOpen(false);
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setConfirming(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!receipt) return <div className="text-sm text-muted-foreground">Fuel receipt not found.</div>;

  return (
    <div>
      <PageHeader
        title={receipt.reference}
        description="Fuel receipt details"
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/fuel/receipts">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            {receipt.status === "DRAFT" && (
              <PermissionGuard require="fuel:receipt:confirm">
                <Button onClick={() => setConfirmOpen(true)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Confirm Receipt
                </Button>
              </PermissionGuard>
            )}
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><StatusBadge status={receipt.status} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Quantity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatLiters(receipt.quantityLiters)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Price / Liter</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(receipt.pricePerLiter)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Total Cost</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatMoney(receipt.totalCost)}</div></CardContent>
        </Card>
      </div>

      <Card className="max-w-3xl">
        <CardHeader><CardTitle className="text-base">Receipt Information</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Tank</span><div className="font-medium">{receipt.tank?.name ?? "-"} {receipt.tank ? `(${receipt.tank.code})` : ""}</div></div>
          <div><span className="text-muted-foreground">Fuel Type</span><div className="font-medium">{receipt.tank?.fuelType ?? "-"}</div></div>
          <div><span className="text-muted-foreground">Supplier</span><div className="font-medium">{receipt.supplierName ?? "-"}</div></div>
          <div><span className="text-muted-foreground">Delivery Note</span><div className="font-medium">{receipt.deliveryNoteRef ?? "-"}</div></div>
          <div><span className="text-muted-foreground">Created</span><div className="font-medium">{formatDate(receipt.createdAt)}</div></div>
          <div><span className="text-muted-foreground">Confirmed</span><div className="font-medium">{formatDate(receipt.confirmedAt)}</div></div>
          {receipt.notes && <div className="sm:col-span-2"><span className="text-muted-foreground">Notes</span><div className="font-medium">{receipt.notes}</div></div>}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Confirm fuel receipt?"
        description="This will increase the selected tank level and lock the receipt status."
        confirmLabel="Confirm Receipt"
        loading={confirming}
        onConfirm={confirmReceipt}
      />
    </div>
  );
}

