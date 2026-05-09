"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Power } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { ConfirmDialog } from "@/components/shared/ConfirmDialog";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FuelLevelBadge, formatDate, formatLiters, formatMoney } from "../../_components/fuel-ui";

interface FuelReceipt {
  id: string;
  reference: string;
  quantityLiters: number;
  totalCost: number | null;
  status: string;
  createdAt: string;
}

interface FuelIssue {
  id: string;
  reference: string;
  quantityLiters: number;
  totalCost: number | null;
  issuedAt: string;
  vehicle?: { plateNumber: string } | null;
}

interface FuelTank {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  isActive: boolean;
  notes: string | null;
  receipts: FuelReceipt[];
  issues: FuelIssue[];
}

export default function FuelTankDetailPage() {
  const params = useParams<{ id: string }>();
  const [tank, setTank] = useState<FuelTank | null>(null);
  const [loading, setLoading] = useState(true);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [statusLoading, setStatusLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fuel-tanks/${params.id}`);
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to load tank"); return; }
      setTank(json.data);
    } catch {
      toast.error("Failed to load tank");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleStatus() {
    if (!tank) return;
    setStatusLoading(true);
    try {
      const res = await fetch(`/api/fuel-tanks/${tank.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !tank.isActive }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update tank status"); return; }
      toast.success(tank.isActive ? "Tank deactivated" : "Tank activated");
      setConfirmOpen(false);
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setStatusLoading(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!tank) return <div className="text-sm text-muted-foreground">Fuel tank not found.</div>;

  const receiptColumns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: FuelReceipt) => (
        <Link href={`/fuel/receipts/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: FuelReceipt) => <span>{formatLiters(row.quantityLiters)}</span>,
    },
    {
      key: "cost",
      header: "Cost",
      cell: (row: FuelReceipt) => <span className="text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "status",
      header: "Status",
      cell: (row: FuelReceipt) => <StatusBadge status={row.status} />,
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (row: FuelReceipt) => <span className="text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
  ];

  const issueColumns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: FuelIssue) => (
        <Link href={`/fuel/issues/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: FuelIssue) => <span>{row.vehicle?.plateNumber ?? "-"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: FuelIssue) => <span>{formatLiters(row.quantityLiters)}</span>,
    },
    {
      key: "issuedAt",
      header: "Issued",
      cell: (row: FuelIssue) => <span className="text-muted-foreground">{formatDate(row.issuedAt)}</span>,
    },
  ];

  return (
    <div>
      <PageHeader
        title={tank.name}
        description={`${tank.code} - ${tank.fuelType}`}
        actions={
          <>
            <Button variant="outline" asChild>
              <Link href="/fuel/tanks">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
            <PermissionGuard require="fuel:tank:update">
              <Button variant="outline" onClick={() => setConfirmOpen(true)}>
                <Power className="h-4 w-4 mr-2" />
                {tank.isActive ? "Deactivate" : "Activate"}
              </Button>
            </PermissionGuard>
          </>
        }
      />

      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Status</CardTitle></CardHeader>
          <CardContent><StatusBadge status={tank.isActive} /></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Current Level</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatLiters(tank.currentLevel)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Capacity</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatLiters(tank.capacity)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm text-muted-foreground">Minimum Level</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatLiters(tank.minLevel)}</div></CardContent>
        </Card>
      </div>

      <Card className="mb-6">
        <CardHeader><CardTitle className="text-base">Level</CardTitle></CardHeader>
        <CardContent>
          <FuelLevelBadge currentLevel={tank.currentLevel} capacity={tank.capacity} minLevel={tank.minLevel} />
          {tank.notes && <p className="mt-4 text-sm text-muted-foreground">{tank.notes}</p>}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Receipts</h2>
          <DataTable columns={receiptColumns} data={tank.receipts ?? []} emptyTitle="No receipts" />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Issues</h2>
          <DataTable columns={issueColumns} data={tank.issues ?? []} emptyTitle="No issues" />
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title={tank.isActive ? "Deactivate tank?" : "Activate tank?"}
        description={tank.isActive ? "This tank will no longer be available for new issues." : "This tank will be available for receipts and issues."}
        confirmLabel={tank.isActive ? "Deactivate" : "Activate"}
        loading={statusLoading}
        onConfirm={toggleStatus}
      />
    </div>
  );
}

