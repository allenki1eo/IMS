"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StampBatch {
  id: string;
  batchNumber: string;
  stampType: string;
  quantity: number;
  used: number;
  serialFrom?: string | null;
  serialTo?: string | null;
  receivedAt: string;
  expiresAt?: string | null;
  status: string;
  notes?: string | null;
  activations: Array<{
    id: string;
    reference: string;
    productName: string;
    quantity: number;
    activatedAt: string;
    notes?: string | null;
  }>;
}

function formatDate(value?: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
  });
}

export default function StampBatchDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [batch, setBatch] = useState<StampBatch | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/tra-stamps/batches/${id}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setBatch(json.data);
        else toast.error(json.error ?? "Failed to load stamp batch");
      })
      .catch(() => toast.error("Failed to load stamp batch"))
      .finally(() => setLoading(false));
  }, [id]);

  const balance = useMemo(() => (batch ? batch.quantity - batch.used : 0), [batch]);

  if (loading) return <LoadingState />;
  if (!batch) return <div className="text-muted-foreground">Stamp batch not found.</div>;

  return (
    <div>
      <PageHeader
        title={batch.batchNumber}
        description={`${batch.stampType} stamp batch`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/tra-stamps/batches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Batch Details</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={batch.status} /></div></div>
            <div><p className="text-muted-foreground">Type</p><p className="mt-1 font-medium">{batch.stampType}</p></div>
            <div><p className="text-muted-foreground">Received</p><p className="mt-1">{formatDate(batch.receivedAt)}</p></div>
            <div><p className="text-muted-foreground">Expires</p><p className="mt-1">{formatDate(batch.expiresAt)}</p></div>
            <div><p className="text-muted-foreground">Serial From</p><p className="mt-1">{batch.serialFrom ?? "-"}</p></div>
            <div><p className="text-muted-foreground">Serial To</p><p className="mt-1">{batch.serialTo ?? "-"}</p></div>
            {batch.notes && <div className="sm:col-span-2"><p className="text-muted-foreground">Notes</p><p className="mt-1 whitespace-pre-wrap">{batch.notes}</p></div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Received</span><span className="font-medium">{batch.quantity.toLocaleString()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Used</span><span className="font-medium">{batch.used.toLocaleString()}</span></div>
            <div className="flex justify-between border-t pt-3 text-base"><span>Balance</span><span className="font-semibold">{balance.toLocaleString()}</span></div>
            {batch.status === "ACTIVE" && balance > 0 && (
              <PermissionGuard require="tra-stamps:stamp:activate">
                <Button className="w-full" asChild>
                  <Link href={`/tra-stamps/activations/new?batchId=${batch.id}`}>Record Activation</Link>
                </Button>
              </PermissionGuard>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activations</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Quantity</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Activated</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Notes</th>
                </tr>
              </thead>
              <tbody>
                {batch.activations.length === 0 ? (
                  <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No activations recorded</td></tr>
                ) : (
                  batch.activations.map((activation) => (
                    <tr key={activation.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{activation.reference}</td>
                      <td className="px-4 py-3">{activation.productName}</td>
                      <td className="px-4 py-3 text-right font-medium">{activation.quantity.toLocaleString()}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(activation.activatedAt)}</td>
                      <td className="px-4 py-3 text-muted-foreground">{activation.notes ?? "-"}</td>
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
