"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { TrendingUp, Users, ShoppingBag, Clock, ArrowUpRight, ArrowDownRight, Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PermissionGuard } from "@/components/shared/PermissionGuard";

interface KPI {
  id: string;
  period: string;
  metric: string;
  target: number;
  achieved: number;
  currency: string;
}

interface RecentOrder {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  customer: { name: string } | null;
}

interface Summary {
  totalCustomers: number;
  totalOrders: number;
  pendingOrders: number;
  thisMonth: { revenue: number; orders: number };
  lastMonth: { revenue: number; orders: number };
  kpis: KPI[];
  recentOrders: RecentOrder[];
}

function formatMoney(amount: number, currency = "TZS") {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function pct(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export default function SalesOverviewPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/sales/summary")
      .then((r) => r.json())
      .then((d) => setSummary(d.data))
      .catch(() => toast.error("Failed to load sales summary"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  const revenueChange = summary ? pct(summary.thisMonth.revenue, summary.lastMonth.revenue) : null;

  return (
    <div>
      <PageHeader
        title="Sales Integration"
        description="Customer orders and sales performance overview"
        actions={
          <PermissionGuard require="sales:order:create">
            <Button asChild>
              <Link href="/sales/orders/new">
                <Plus className="h-4 w-4 mr-2" />
                New Order
              </Link>
            </Button>
          </PermissionGuard>
        }
      />

      {/* KPI Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold">{summary?.totalCustomers ?? 0}</p>
              <p className="text-sm text-muted-foreground">Active Customers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
              <ShoppingBag className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{summary?.totalOrders ?? 0}</p>
              <p className="text-sm text-muted-foreground">Total Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
              <Clock className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-orange-600">{summary?.pendingOrders ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pending Orders</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 pt-6">
            <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
              <TrendingUp className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="text-xl font-bold text-purple-600">
                {formatMoney(summary?.thisMonth.revenue ?? 0)}
              </p>
              <div className="flex items-center gap-1">
                <p className="text-xs text-muted-foreground">This Month Revenue</p>
                {revenueChange !== null && (
                  <span className={`flex items-center text-xs font-medium ${revenueChange >= 0 ? "text-green-600" : "text-red-500"}`}>
                    {revenueChange >= 0
                      ? <ArrowUpRight className="h-3 w-3" />
                      : <ArrowDownRight className="h-3 w-3" />}
                    {Math.abs(revenueChange)}%
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* KPI Progress */}
        {summary && summary.kpis.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Monthly KPI Targets</CardTitle>
              <Link href="/sales/kpis" className="text-sm text-primary hover:underline">
                Manage
              </Link>
            </CardHeader>
            <CardContent className="space-y-4">
              {summary.kpis.map((kpi) => {
                const progress = kpi.target > 0 ? Math.min(100, Math.round((kpi.achieved / kpi.target) * 100)) : 0;
                const metricLabel: Record<string, string> = {
                  REVENUE: "Revenue",
                  ORDERS: "Orders",
                  NEW_CUSTOMERS: "New Customers",
                  AVG_ORDER_VALUE: "Avg Order Value",
                };
                return (
                  <div key={kpi.id}>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-medium">{metricLabel[kpi.metric] ?? kpi.metric}</span>
                      <span className="text-sm text-muted-foreground">
                        {kpi.metric === "ORDERS" || kpi.metric === "NEW_CUSTOMERS"
                          ? `${kpi.achieved} / ${kpi.target}`
                          : `${formatMoney(kpi.achieved, kpi.currency)} / ${formatMoney(kpi.target, kpi.currency)}`}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${progress >= 100 ? "bg-green-500" : progress >= 70 ? "bg-blue-500" : "bg-orange-400"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">{progress}% achieved</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Orders</CardTitle>
            <Link href="/sales/orders" className="text-sm text-primary hover:underline">
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
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {(!summary?.recentOrders || summary.recentOrders.length === 0) ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                        No sales orders yet
                      </td>
                    </tr>
                  ) : (
                    summary.recentOrders.map((order) => (
                      <tr key={order.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3">
                          <Link href={`/sales/orders/${order.id}`} className="font-medium hover:underline">
                            {order.reference}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{order.customer?.name ?? "—"}</td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {formatMoney(order.totalAmount, order.currency)}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={order.status} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {format(new Date(order.orderDate), "dd MMM yyyy")}
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

      {/* Quick Links */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <Link href="/sales/orders" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-blue-100 flex items-center justify-center">
                <ShoppingBag className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium">Sales Orders</p>
                <p className="text-xs text-muted-foreground">View and manage all orders</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <Link href="/sales/customers" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-green-100 flex items-center justify-center">
                <Users className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="font-medium">Customers</p>
                <p className="text-xs text-muted-foreground">View and manage customers</p>
              </div>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <CardContent className="pt-6">
            <Link href="/sales/kpis" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-md bg-purple-100 flex items-center justify-center">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="font-medium">KPIs & Targets</p>
                <p className="text-xs text-muted-foreground">Manage sales targets</p>
              </div>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
