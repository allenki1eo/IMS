"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Send, PackageCheck } from "lucide-react";
import { format } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface TransferLine {
  id: string;
  quantity: number;
  item: { code: string; name: string };
  fromLocation?: { name: string } | null;
  toLocation?: { name: string } | null;
}

interface Transfer {
  id: string;
  reference: string;
  status: string;
  notes: string | null;
  createdAt: string;
  fromWarehouse?: { name: string } | null;
  toWarehouse?: { name: string } | null;
  lines: TransferLine[];
}

export default function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);

  const fetchTransfer = useCallback(async () => {
    try {
      const res = await fetch(`/api/stock-transfers/${id}`);
      const json = await res.json();
      setTransfer(json.data ?? json);
    } catch {
      toast.error("Failed to load transfer");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchTransfer(); }, [fetchTransfer]);

  async function performAction(action: "dispatch" | "receive") {
    setActioning(true);
    try {
      const res = await fetch(`/api/stock-transfers/${id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? `Failed to ${action}`); return; }
      toast.success(action === "dispatch" ? "Transfer dispatched" : "Transfer received — stock updated");
      fetchTransfer();
    } catch {
      toast.error("Network error");
    } finally {
      setActioning(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!transfer) return <div className="text-muted-foreground">Transfer not found.</div>;

  return (
    <div>
      <PageHeader
        title={transfer.reference}
        description={`${transfer.fromWarehouse?.name ?? "?"} → ${transfer.toWarehouse?.name ?? "?"}`}
        actions={
          <div className="flex gap-2">
            {transfer.status === "DRAFT" && (
              <PermissionGuard require="warehouse:transfer:dispatch">
                <Button onClick={() => performAction("dispatch")} disabled={actioning}>
                  {actioning ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Dispatch
                </Button>
              </PermissionGuard>
            )}
            {transfer.status === "DISPATCHED" && (
              <PermissionGuard require="warehouse:transfer:receive">
                <Button onClick={() => performAction("receive")} disabled={actioning}>
                  {actioning ? (
                    <LoadingSpinner className="mr-2" />
                  ) : (
                    <PackageCheck className="h-4 w-4 mr-2" />
                  )}
                  Mark Received
                </Button>
              </PermissionGuard>
            )}
            <Button variant="outline" asChild>
              <Link href="/warehouse/transfers">
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
            <StatusBadge status={transfer.status} />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">Date</p>
            <p className="text-sm font-medium">
              {format(new Date(transfer.createdAt), "dd MMM yyyy")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <p className="text-sm font-medium">{transfer.fromWarehouse?.name ?? "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <p className="text-sm font-medium">{transfer.toWarehouse?.name ?? "—"}</p>
          </CardContent>
        </Card>
      </div>

      {transfer.notes && (
        <p className="text-sm text-muted-foreground mb-4 p-3 bg-muted rounded-md">
          {transfer.notes}
        </p>
      )}

      {/* Lines */}
      <h2 className="text-lg font-semibold mb-3">Line Items</h2>
      {transfer.lines.length === 0 ? (
        <p className="text-muted-foreground text-sm">No line items.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Item</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">From Location</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">To Location</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground">Qty</th>
              </tr>
            </thead>
            <tbody>
              {transfer.lines.map((line) => (
                <tr key={line.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <span className="font-medium">{line.item.name}</span>
                    <br />
                    <code className="text-xs text-muted-foreground">{line.item.code}</code>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {line.fromLocation?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {line.toLocation?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-semibold">{line.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Action hints */}
      {transfer.status === "DRAFT" && (
        <>
          <Separator className="my-6" />
          <PermissionGuard require="warehouse:transfer:dispatch">
            <div className="flex items-center gap-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-blue-800">Ready to dispatch?</p>
                <p className="text-xs text-blue-700">
                  Dispatching marks the transfer as in-transit. Stock will deduct from the source warehouse.
                </p>
              </div>
              <Button onClick={() => performAction("dispatch")} disabled={actioning}>
                {actioning && <LoadingSpinner className="mr-2" />}
                Dispatch
              </Button>
            </div>
          </PermissionGuard>
        </>
      )}

      {transfer.status === "DISPATCHED" && (
        <>
          <Separator className="my-6" />
          <PermissionGuard require="warehouse:transfer:receive">
            <div className="flex items-center gap-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex-1">
                <p className="text-sm font-medium text-green-800">Confirm receipt?</p>
                <p className="text-xs text-green-700">
                  Marking as received will add the stock to the destination warehouse.
                </p>
              </div>
              <Button onClick={() => performAction("receive")} disabled={actioning}>
                {actioning && <LoadingSpinner className="mr-2" />}
                Mark Received
              </Button>
            </div>
          </PermissionGuard>
        </>
      )}
    </div>
  );
}
