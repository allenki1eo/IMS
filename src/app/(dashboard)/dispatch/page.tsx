"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { Package, CheckCircle, Truck, Archive } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderRow {
  id: string;
  reference: string;
  customerName: string;
  status: string;
  scheduledDate?: string | null;
  vehicle?: { plateNumber: string } | null;
}

interface LotRow {
  id: string;
  product?: { code: string; name: string } | null;
  lotNumber?: string | null;
  availableQty: number;
  bestBefore?: string | null;
  status: string;
}

interface Stats {
  totalOrders: number;
  confirmed: number;
  dispatched: number;
  fgLots: number;
}

export default function DispatchOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [recentOrders, setRecentOrders] = useState<OrderRow[]>([]);
  const [recentLots, setRecentLots] = useState<LotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/dispatch/orders?pageSize=5").then((r) => r.json()),
      fetch("/api/dispatch/orders?status=CONFIRMED&pageSize=200").then((r) => r.json()),
      fetch("/api/dispatch/orders?status=DISPATCHED&pageSize=200").then((r) => r.json()),
      fetch("/api/dispatch/inventory?pageSize=200").then((r) => r.json()),
    ])
      .then(([recentData, confirmedData, dispatchedData, lotsData]) => {
        setStats({
          totalOrders: recentData.meta?.total ?? 0,
          confirmed: confirmedData.meta?.total ?? 0,
          dispatched: dispatchedData.meta?.total ?? 0,
          fgLots: lotsData.meta?.total ?? 0,
        });
        setRecentOrders(recentData.data ?? []);
        setRecentLots((lotsData.data ?? []).slice(0, 5));
      })
      .catch(() => toast.error("Failed to load dispatch overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Finished Goods & Dispatch"
        description="Overview of dispatch orders and finished goods inventory"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Package className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{stats?.totalOrders ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Dispatch Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{stats?.confirmed ?? 0}</p>
              <p className="text-sm text-muted-foreground">Confirmed (Ready to Ship)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Truck className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{stats?.dispatched ?? 0}</p>
              <p className="text-sm text-muted-foreground">In Transit (Dispatched)</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <Archive className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{stats?.fgLots ?? 0}</p>
              <p className="text-sm text-muted-foreground">FG Lots in Stock</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two-column tables */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Recent Dispatch Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Dispatch Orders</CardTitle>
            <Link href="/dispatch/orders" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Customer</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Scheduled</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Vehicle</th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No dispatch orders found
                      </td>
                    </tr>
                  ) : (
                    recentOrders.map((order) => (
                      <tr key={order.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/dispatch/orders/${order.id}`} className="font-medium hover:underline">
                            {order.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{order.customerName}</td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {order.scheduledDate
                            ? format(new Date(order.scheduledDate), "dd MMM yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {order.vehicle?.plateNumber ?? "—"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {/* Recent FG Inventory */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent FG Inventory</CardTitle>
            <Link href="/dispatch/inventory" className="text-sm text-primary hover:underline">
              View all
            </Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Product</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Lot #</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Avail. Qty</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Best Before</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {recentLots.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No FG lots found
                      </td>
                    </tr>
                  ) : (
                    recentLots.map((lot) => (
                      <tr key={lot.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/dispatch/inventory/${lot.id}`} className="font-medium hover:underline">
                            {lot.product?.name ?? "—"}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{lot.lotNumber ?? "—"}</td>
                        <td className="px-4 py-3">{lot.availableQty.toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {lot.bestBefore
                            ? format(new Date(lot.bestBefore), "dd MMM yyyy")
                            : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={lot.status} />
                        </td>
                      </tr>
                    ))
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
