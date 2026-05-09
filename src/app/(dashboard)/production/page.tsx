"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, Factory, FlaskConical, PlayCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, qty, StatCard } from "./_components/production-ui";

interface BatchRow {
  id: string;
  reference: string;
  productName: string;
  plannedQty: number;
  actualQty?: number | null;
  uom: string;
  status: string;
  plannedStart?: string | null;
  line?: { name: string } | null;
}

interface Stats {
  activeLines: number;
  activeRecipes: number;
  plannedBatches: number;
  inProgressBatches: number;
}

export default function ProductionOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/production/lines?pageSize=1&status=ACTIVE").then((r) => r.json()),
      fetch("/api/production/recipes?pageSize=1&status=ACTIVE").then((r) => r.json()),
      fetch("/api/production/batches?pageSize=1&status=PLANNED").then((r) => r.json()),
      fetch("/api/production/batches?pageSize=1&status=IN_PROGRESS").then((r) => r.json()),
      fetch("/api/production/batches?pageSize=6").then((r) => r.json()),
    ])
      .then(([linesData, recipesData, plannedData, progressData, batchesData]) => {
        setStats({
          activeLines: linesData.meta?.total ?? 0,
          activeRecipes: recipesData.meta?.total ?? 0,
          plannedBatches: plannedData.meta?.total ?? 0,
          inProgressBatches: progressData.meta?.total ?? 0,
        });
        setBatches(batchesData.data ?? []);
      })
      .catch(() => toast.error("Failed to load production overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Production & Brewing"
        description="Plan batches, manage production lines, and maintain recipes"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Active Lines" value={stats?.activeLines ?? 0} icon={Factory} href="/production/lines" />
        <StatCard title="Active Recipes" value={stats?.activeRecipes ?? 0} icon={FlaskConical} href="/production/recipes" />
        <StatCard title="Planned Batches" value={stats?.plannedBatches ?? 0} icon={ClipboardList} href="/production/batches?status=PLANNED" />
        <StatCard title="In Progress" value={stats?.inProgressBatches ?? 0} icon={PlayCircle} href="/production/batches?status=IN_PROGRESS" highlight={Boolean(stats?.inProgressBatches)} />
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Batches</CardTitle>
          <Link href="/production/batches" className="text-sm text-primary hover:underline">View all</Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Line</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Planned</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Start</th>
                </tr>
              </thead>
              <tbody>
                {batches.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">No production batches found</td></tr>
                ) : batches.map((batch) => (
                  <tr key={batch.id} className="border-t hover:bg-muted/30">
                    <td className="px-4 py-3"><Link href={`/production/batches/${batch.id}`} className="font-medium hover:underline">{batch.reference}</Link></td>
                    <td className="px-4 py-3">{batch.productName}</td>
                    <td className="px-4 py-3 text-muted-foreground">{batch.line?.name ?? "-"}</td>
                    <td className="px-4 py-3"><StatusBadge status={batch.status} /></td>
                    <td className="px-4 py-3">{qty(batch.plannedQty, batch.uom)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(batch.plannedStart)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

