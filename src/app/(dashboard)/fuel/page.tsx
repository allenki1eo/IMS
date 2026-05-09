"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { AlertTriangle, BarChart3, Fuel, Receipt, TrendingDown } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { DataTable } from "@/components/shared/DataTable";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { FuelLevelBadge, StatCard, formatDate, formatLiters, formatMoney } from "./_components/fuel-ui";

interface TankRow {
  id: string;
  name: string;
  code: string;
  fuelType: string;
  capacity: number;
  currentLevel: number;
  minLevel: number;
  isActive: boolean;
}

interface IssueRow {
  id: string;
  reference: string;
  issuedAt: string;
  quantityLiters: number;
  totalCost: number | null;
  tank?: { name: string; code: string } | null;
  vehicle?: { plateNumber: string } | null;
}

export default function FuelOverviewPage() {
  const [tanks, setTanks] = useState<TankRow[]>([]);
  const [issues, setIssues] = useState<IssueRow[]>([]);
  const [receiptTotal, setReceiptTotal] = useState(0);
  const [issueTotal, setIssueTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [issuesLoading, setIssuesLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setIssuesLoading(true);
    try {
      const [tanksRes, receiptsRes, issuesRes] = await Promise.all([
        fetch("/api/fuel-tanks"),
        fetch("/api/fuel-receipts?pageSize=1"),
        fetch("/api/fuel-issues?pageSize=5"),
      ]);
      const [tanksJson, receiptsJson, issuesJson] = await Promise.all([
        tanksRes.json(),
        receiptsRes.json(),
        issuesRes.json(),
      ]);
      setTanks(tanksJson.data ?? []);
      setReceiptTotal(receiptsJson.meta?.total ?? 0);
      setIssueTotal(issuesJson.meta?.total ?? 0);
      setIssues(issuesJson.data ?? []);
    } catch {
      toast.error("Failed to load fuel dashboard");
    } finally {
      setLoading(false);
      setIssuesLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const lowTanks = tanks
    .filter((tank) => tank.currentLevel <= tank.minLevel || (tank.capacity > 0 && tank.currentLevel / tank.capacity <= 0.25))
    .slice(0, 8);
  const totalCapacity = tanks.reduce((sum, tank) => sum + tank.capacity, 0);
  const totalLevel = tanks.reduce((sum, tank) => sum + tank.currentLevel, 0);

  const tankColumns = [
    {
      key: "code",
      header: "Tank",
      cell: (row: TankRow) => (
        <Link href={`/fuel/tanks/${row.id}`} className="font-medium hover:underline">
          {row.name}
          <span className="ml-2 font-mono text-xs text-muted-foreground">{row.code}</span>
        </Link>
      ),
    },
    {
      key: "fuelType",
      header: "Fuel",
      cell: (row: TankRow) => <span className="text-sm">{row.fuelType}</span>,
    },
    {
      key: "level",
      header: "Level",
      cell: (row: TankRow) => (
        <FuelLevelBadge currentLevel={row.currentLevel} capacity={row.capacity} minLevel={row.minLevel} />
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (row: TankRow) => <StatusBadge status={row.isActive} />,
    },
  ];

  const issueColumns = [
    {
      key: "reference",
      header: "Reference",
      cell: (row: IssueRow) => (
        <Link href={`/fuel/issues/${row.id}`} className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded hover:underline">
          {row.reference}
        </Link>
      ),
    },
    {
      key: "vehicle",
      header: "Vehicle",
      cell: (row: IssueRow) => <span className="text-sm">{row.vehicle?.plateNumber ?? "-"}</span>,
    },
    {
      key: "quantity",
      header: "Quantity",
      cell: (row: IssueRow) => <span className="font-medium">{formatLiters(row.quantityLiters)}</span>,
    },
    {
      key: "totalCost",
      header: "Cost",
      cell: (row: IssueRow) => <span className="text-sm text-muted-foreground">{formatMoney(row.totalCost)}</span>,
    },
    {
      key: "issuedAt",
      header: "Issued",
      cell: (row: IssueRow) => <span className="text-sm text-muted-foreground">{formatDate(row.issuedAt)}</span>,
    },
  ];

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader title="Fuel Management" description="Monitor tanks, receipts, issues, prices, and fuel consumption" />

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCard title="Fuel Tanks" value={tanks.length} icon={Fuel} href="/fuel/tanks" />
        <StatCard title="Total Fuel" value={formatLiters(totalLevel)} icon={BarChart3} href="/fuel/reports" />
        <StatCard title="Receipts" value={receiptTotal} icon={Receipt} href="/fuel/receipts" />
        <StatCard
          title="Low Tanks"
          value={lowTanks.length}
          icon={AlertTriangle}
          href="/fuel/tanks"
          highlight={lowTanks.length > 0}
        />
      </div>

      <div className="mb-6 rounded-md border p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-medium text-muted-foreground">Capacity Utilization</h2>
            <p className="text-2xl font-bold">
              {totalCapacity > 0 ? `${Math.round((totalLevel / totalCapacity) * 100)}%` : "0%"}
            </p>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline">
              <Link href="/fuel/receipts/new">
                <Receipt className="h-4 w-4 mr-2" />
                New Receipt
              </Link>
            </Button>
            <Button asChild>
              <Link href="/fuel/issues/new">
                <TrendingDown className="h-4 w-4 mr-2" />
                Issue Fuel
              </Link>
            </Button>
          </div>
        </div>
        <div className="mt-4 h-2 rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-primary"
            style={{ width: `${totalCapacity > 0 ? Math.max(0, Math.min(100, (totalLevel / totalCapacity) * 100)) : 0}%` }}
          />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="text-lg font-semibold mb-3">Tanks Needing Attention</h2>
          <DataTable
            columns={tankColumns}
            data={lowTanks}
            emptyTitle="No low fuel tanks"
            emptyDescription="Tank levels are above their minimum thresholds."
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold mb-3">Recent Issues</h2>
          <DataTable
            columns={issueColumns}
            data={issues}
            loading={issuesLoading}
            emptyTitle="No fuel issues yet"
            emptyDescription="Fuel issued to vehicles will appear here."
          />
          <div className="mt-3 text-sm text-muted-foreground">{issueTotal} total issue records</div>
        </div>
      </div>
    </div>
  );
}

