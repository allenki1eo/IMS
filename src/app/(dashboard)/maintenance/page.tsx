"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Wrench, ClipboardList, CheckCircle, Package } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface WorkOrderRow {
  id: string;
  reference: string;
  vehicle?: { plateNumber: string } | null;
  maintenanceType: string;
  priority: string;
  status: string;
  createdAt: string;
}

interface SparePartRow {
  id: string;
  code: string;
  name: string;
  currentStock: number;
  minStock: number;
  uom: string;
}

interface Stats {
  totalWorkOrders: number;
  openWorkOrders: number;
  completedThisMonth: number;
  lowStockParts: number;
}

function priorityClass(priority: string): string {
  switch (priority) {
    case "CRITICAL": return "bg-red-100 text-red-700";
    case "HIGH": return "bg-orange-100 text-orange-700";
    case "MEDIUM": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

function stockStatusLabel(part: SparePartRow): { label: string; color: string } {
  if (part.currentStock === 0) return { label: "Out", color: "text-red-600" };
  if (part.currentStock <= part.minStock) return { label: "Low", color: "text-amber-600" };
  return { label: "OK", color: "text-green-600" };
}

export default function MaintenanceOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrderRow[]>([]);
  const [lowStockParts, setLowStockParts] = useState<SparePartRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    Promise.all([
      fetch("/api/maintenance/work-orders?pageSize=5").then((r) => r.json()),
      fetch(`/api/maintenance/work-orders?pageSize=200&status=PENDING`).then((r) => r.json()),
      fetch(`/api/maintenance/work-orders?pageSize=200&status=IN_PROGRESS`).then((r) => r.json()),
      fetch(`/api/maintenance/work-orders?pageSize=200&status=COMPLETED&from=${monthStart}&to=${monthEnd}`).then((r) => r.json()),
      fetch("/api/maintenance/spare-parts?lowStock=true&pageSize=5").then((r) => r.json()),
    ])
      .then(([recentData, pendingData, inProgressData, completedData, lowStockData]) => {
        const open = (pendingData.meta?.total ?? 0) + (inProgressData.meta?.total ?? 0);
        setStats({
          totalWorkOrders: recentData.meta?.total ?? 0,
          openWorkOrders: open,
          completedThisMonth: completedData.meta?.total ?? 0,
          lowStockParts: lowStockData.meta?.total ?? 0,
        });
        setRecentWorkOrders(recentData.data ?? []);
        setLowStockParts(lowStockData.data ?? []);
      })
      .catch(() => toast.error("Failed to load maintenance overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Maintenance & Spare Parts"
        description="Overview of work orders, schedules, and spare parts inventory"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <ClipboardList className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalWorkOrders ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Work Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Wrench className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats?.openWorkOrders ?? 0}</p>
              <p className="text-sm text-muted-foreground">Open Work Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats?.completedThisMonth ?? 0}</p>
              <p className="text-sm text-muted-foreground">Completed This Month</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{stats?.lowStockParts ?? 0}</p>
              <p className="text-sm text-muted-foreground">Low Stock Parts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Work Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Work Orders</CardTitle>
            <Link href="/maintenance/work-orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {recentWorkOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No work orders found
                      </td>
                    </tr>
                  ) : (
                    recentWorkOrders.map((wo) => (
                      <tr key={wo.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/maintenance/work-orders/${wo.id}`} className="font-medium hover:underline">
                            {wo.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {wo.vehicle?.plateNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(wo.priority)}`}>
                            {wo.priority}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={wo.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(wo.createdAt), "dd MMM yyyy")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Parts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Low Stock Parts</CardTitle>
            <Link href="/maintenance/parts?lowStock=true" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Stock</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Min</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {lowStockParts.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No low stock parts
                      </td>
                    </tr>
                  ) : (
                    lowStockParts.map((part) => {
                      const st = stockStatusLabel(part);
                      return (
                        <tr key={part.id} className="border-t hover:bg-muted/30">
                          <td className="px-4 py-3">
                            <Link href={`/maintenance/parts/${part.id}`} className="hover:underline">
                              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{part.code}</code>
                            </Link>
                          </td>
                          <td className="px-4 py-3 font-medium">{part.name}</td>
                          <td className="px-4 py-3">
                            {part.currentStock.toLocaleString()} {part.uom}
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {part.minStock.toLocaleString()} {part.uom}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-semibold ${st.color}`}>{st.label}</span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
