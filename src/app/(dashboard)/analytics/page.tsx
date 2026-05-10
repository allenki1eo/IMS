"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import Link from "next/link";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell,
} from "recharts";
import {
  Users, Warehouse, Truck, Fuel, Wrench, ShoppingCart,
  Factory, FlaskConical, SendHorizonal, Landmark, AlertTriangle,
  TrendingUp, TrendingDown,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8", "#82CA9D"];

export default function AnalyticsPage() {
  const [kpis, setKpis] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [kpiRes, trendRes] = await Promise.all([
          fetch("/api/analytics/kpis"),
          fetch("/api/analytics/trends?months=6"),
        ]);
        const kpiJson = await kpiRes.json();
        const trendJson = await trendRes.json();
        if (kpiRes.ok) setKpis(kpiJson.data);
        if (trendRes.ok) setTrends(trendJson.data);
      } catch {
        toast.error("Failed to load analytics");
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  if (loading) return <LoadingState text="Loading analytics..." />;

  const kpiCards = [
    { label: "Users", value: kpis?.totalUsers || 0, icon: Users, href: "/admin/users" },
    { label: "Items", value: kpis?.totalItems || 0, icon: Warehouse, href: "/warehouse/items" },
    { label: "Vehicles", value: kpis?.totalVehicles || 0, icon: Truck, href: "/transport/vehicles" },
    { label: "Fuel Tanks", value: kpis?.totalFuelTanks || 0, icon: Fuel, href: "/fuel/tanks" },
    { label: "Open Work Orders", value: kpis?.openWorkOrders || 0, icon: Wrench, href: "/maintenance/work-orders" },
    { label: "Suppliers", value: kpis?.totalSuppliers || 0, icon: ShoppingCart, href: "/procurement/suppliers" },
    { label: "Active Batches", value: kpis?.activeBatches || 0, icon: Factory, href: "/production/batches" },
    { label: "Open NCRs", value: kpis?.openNCRs || 0, icon: FlaskConical, href: "/qc/ncr" },
    { label: "Pending Dispatch", value: kpis?.pendingDispatchOrders || 0, icon: SendHorizonal, href: "/dispatch/orders" },
    { label: "Bank Balance", value: `$${(kpis?.totalBankBalance || 0).toLocaleString()}`, icon: Landmark, href: "/finance/bank-accounts" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Management Analytics" description="Executive dashboard with KPIs and trends across all modules" />

      <div className="flex gap-2">
        <Link href="/analytics/operations"><Button variant="outline">Operational Analytics</Button></Link>
        <Link href="/analytics/financial"><Button variant="outline">Financial Analytics</Button></Link>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {kpiCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">{card.label}</CardTitle>
                <card.icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{card.value}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader><CardTitle>Monthly Activity Trends</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="purchaseOrders" name="PO Value" fill="#0088FE" />
                <Bar dataKey="dispatchOrders" name="Dispatch Value" fill="#00C49F" />
                <Bar dataKey="journalActivity" name="Journal Activity" fill="#FFBB28" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Operational Volume</CardTitle></CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="grns" name="GRNs" stroke="#0088FE" />
                <Line type="monotone" dataKey="trips" name="Trips" stroke="#00C49F" />
                <Line type="monotone" dataKey="batches" name="Batches" stroke="#FF8042" />
                <Line type="monotone" dataKey="workOrders" name="Work Orders" stroke="#8884D8" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
