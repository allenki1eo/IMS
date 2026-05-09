"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { ClipboardList, Handshake, PackageCheck, ShoppingCart } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDate, formatMoney, priorityClass, StatCard } from "./_components/procurement-ui";

interface RequestRow {
  id: string;
  reference: string;
  purpose: string;
  priority: string;
  status: string;
  estimatedTotal: number;
  createdAt: string;
}

interface OrderRow {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  currency: string;
  createdAt: string;
  supplier?: { name: string } | null;
}

interface Stats {
  activeSuppliers: number;
  submittedRequests: number;
  openOrders: number;
  partialReceipts: number;
}

export default function ProcurementOverviewPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [requests, setRequests] = useState<RequestRow[]>([]);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/procurement/suppliers?pageSize=1&status=ACTIVE").then((r) => r.json()),
      fetch("/api/procurement/requests?pageSize=1&status=SUBMITTED").then((r) => r.json()),
      fetch("/api/procurement/orders?pageSize=1&status=SENT").then((r) => r.json()),
      fetch("/api/procurement/orders?pageSize=1&status=PARTIALLY_RECEIVED").then((r) => r.json()),
      fetch("/api/procurement/requests?pageSize=5").then((r) => r.json()),
      fetch("/api/procurement/orders?pageSize=5").then((r) => r.json()),
    ])
      .then(([suppliersData, submittedData, sentData, partialData, requestsData, ordersData]) => {
        setStats({
          activeSuppliers: suppliersData.meta?.total ?? 0,
          submittedRequests: submittedData.meta?.total ?? 0,
          openOrders: sentData.meta?.total ?? 0,
          partialReceipts: partialData.meta?.total ?? 0,
        });
        setRequests(requestsData.data ?? []);
        setOrders(ordersData.data ?? []);
      })
      .catch(() => toast.error("Failed to load procurement overview"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Manage suppliers, purchase requests, purchase orders, and receiving"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCard title="Active Suppliers" value={stats?.activeSuppliers ?? 0} icon={Handshake} href="/procurement/suppliers" />
        <StatCard title="Requests Awaiting Approval" value={stats?.submittedRequests ?? 0} icon={ClipboardList} href="/procurement/requests?status=SUBMITTED" highlight />
        <StatCard title="Sent Orders" value={stats?.openOrders ?? 0} icon={ShoppingCart} href="/procurement/orders?status=SENT" />
        <StatCard title="Partial Receipts" value={stats?.partialReceipts ?? 0} icon={PackageCheck} href="/procurement/orders?status=PARTIALLY_RECEIVED" highlight={Boolean(stats?.partialReceipts)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Purchase Requests</CardTitle>
            <Link href="/procurement/requests" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Purpose</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Priority</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No purchase requests found</td></tr>
                  ) : requests.map((request) => (
                    <tr key={request.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/procurement/requests/${request.id}`} className="font-medium hover:underline">{request.reference}</Link>
                      </td>
                      <td className="px-4 py-3 max-w-[220px] truncate">{request.purpose}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${priorityClass(request.priority)}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={request.status} /></td>
                      <td className="px-4 py-3">{formatMoney(request.estimatedTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Recent Purchase Orders</CardTitle>
            <Link href="/procurement/orders" className="text-sm text-primary hover:underline">View all</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Supplier</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Total</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.length === 0 ? (
                    <tr><td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">No purchase orders found</td></tr>
                  ) : orders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/procurement/orders/${order.id}`} className="font-medium hover:underline">{order.reference}</Link>
                      </td>
                      <td className="px-4 py-3">{order.supplier?.name ?? "-"}</td>
                      <td className="px-4 py-3"><StatusBadge status={order.status} /></td>
                      <td className="px-4 py-3">{formatMoney(order.totalAmount, order.currency)}</td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">{formatDate(order.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

