"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OrderRow {
  id: string;
  reference: string;
  status: string;
  totalAmount: number;
  currency: string;
  orderDate: string;
  _count?: { lines: number };
}

interface Customer {
  id: string;
  code: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  contactPerson?: string | null;
  creditLimit?: number | null;
  currency: string;
  status: string;
  notes?: string | null;
  syncedAt: string;
  createdAt: string;
  externalId?: string | null;
  orders: OrderRow[];
  _count: { orders: number };
}

function formatMoney(amount: number, currency = "TZS") {
  return `${currency} ${amount.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export default function CustomerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/sales/customers/${id}`)
      .then((r) => r.json())
      .then((d) => setCustomer(d.data))
      .catch(() => toast.error("Failed to load customer"))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingState />;
  if (!customer) return (
    <div className="text-center py-12">
      <p className="text-muted-foreground">Customer not found.</p>
      <Button variant="outline" asChild className="mt-4">
        <Link href="/sales/customers">Back to Customers</Link>
      </Button>
    </div>
  );

  return (
    <div>
      <PageHeader
        title={customer.name}
        description={`Customer · ${customer.code}`}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={customer.status} />
            <Button variant="outline" size="sm" asChild>
              <Link href="/sales/customers">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Contact Details */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Contact Information</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Code</span>
              <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">{customer.code}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Status</span>
              <StatusBadge status={customer.status} />
            </div>
            {customer.email && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <a href={`mailto:${customer.email}`} className="text-primary hover:underline">{customer.email}</a>
              </div>
            )}
            {customer.phone && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phone</span>
                <span>{customer.phone}</span>
              </div>
            )}
            {customer.contactPerson && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Contact Person</span>
                <span>{customer.contactPerson}</span>
              </div>
            )}
            {customer.address && (
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">Address</span>
                <span className="text-right">{customer.address}</span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Account Details */}
        <Card>
          <CardHeader><CardTitle className="text-sm">Account Details</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Currency</span>
              <span className="font-medium">{customer.currency}</span>
            </div>
            {customer.creditLimit != null && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Credit Limit</span>
                <span className="font-medium">{formatMoney(customer.creditLimit, customer.currency)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total Orders</span>
              <span className="font-medium">{customer._count.orders}</span>
            </div>
            {customer.externalId && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">External ID</span>
                <span className="font-mono text-xs">{customer.externalId}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">Last Synced</span>
              <span className="text-muted-foreground">{format(new Date(customer.syncedAt), "dd MMM yyyy HH:mm")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Created</span>
              <span className="text-muted-foreground">{format(new Date(customer.createdAt), "dd MMM yyyy")}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {customer.notes && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{customer.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Recent Orders */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Recent Orders</CardTitle>
          <Link href={`/sales/orders?customerId=${customer.id}`} className="text-sm text-primary hover:underline">
            View all
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Total</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {customer.orders.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  customer.orders.map((order) => (
                    <tr key={order.id} className="border-t hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Link href={`/sales/orders/${order.id}`} className="font-medium hover:underline">
                          {order.reference}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3 text-right font-medium">
                        {formatMoney(order.totalAmount, order.currency)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.orderDate), "dd MMM yyyy")}
                      </td>
                      <td className="px-4 py-3">
                        <Button variant="outline" size="sm" asChild>
                          <Link href={`/sales/orders/${order.id}`}>View</Link>
                        </Button>
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
  );
}
