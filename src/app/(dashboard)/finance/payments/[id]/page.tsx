"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";

export default function PaymentDetailPage() {
  const { id } = useParams();
  const [payment, setPayment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canComplete = usePermission("finance:payment:complete");
  const canCancel = usePermission("finance:payment:cancel");

  async function fetchPayment() {
    try {
      const res = await fetch(`/api/finance/payments/${id}`);
      const json = await res.json();
      if (res.ok) {
        setPayment(json.data);
      } else {
        toast.error(json.message || "Payment not found");
      }
    } catch {
      toast.error("Failed to load payment");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchPayment();
  }, [id]);

  async function completePayment() {
    try {
      const res = await fetch(`/api/finance/payments/${id}/complete`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Payment completed");
        fetchPayment();
      } else {
        toast.error(json.message || "Failed to complete");
      }
    } catch {
      toast.error("Failed to complete payment");
    }
  }

  async function cancelPayment() {
    try {
      const res = await fetch(`/api/finance/payments/${id}/cancel`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Payment cancelled");
        fetchPayment();
      } else {
        toast.error(json.message || "Failed to cancel");
      }
    } catch {
      toast.error("Failed to cancel payment");
    }
  }

  if (loading) return <LoadingState message="Loading payment..." />;
  if (!payment) return <div className="text-muted-foreground">Payment not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/finance/payments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Payments
      </Link>

      <div className="flex items-center justify-between">
        <PageHeader title={payment.paymentNumber} description={`${payment.type} to ${payment.partyName}`} />
        <div className="flex gap-2">
          {payment.status === "PENDING" && canComplete && (
            <Button onClick={completePayment}><CheckCircle className="mr-2 h-4 w-4" />Complete</Button>
          )}
          {payment.status !== "CANCELLED" && canCancel && (
            <Button variant="destructive" onClick={cancelPayment}><XCircle className="mr-2 h-4 w-4" />Cancel</Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Type</CardTitle></CardHeader><CardContent><Badge>{payment.type}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader><CardContent><Badge variant={payment.status === "COMPLETED" ? "default" : payment.status === "CANCELLED" ? "destructive" : "secondary"}>{payment.status}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Amount</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${payment.amount.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Method</CardTitle></CardHeader><CardContent>{payment.paymentMethod}</CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Payment Details</CardTitle></CardHeader>
        <CardContent className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Party</span><span>{payment.partyName}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Date</span><span>{new Date(payment.paymentDate).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Currency</span><span>{payment.currency}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Reference</span><span>{payment.reference || "-"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Bank Account</span><span>{payment.bankAccount?.name || "-"}</span></div>
          {payment.notes && <div className="pt-2 border-t"><span className="text-muted-foreground">Notes</span><p className="mt-1">{payment.notes}</p></div>}
        </CardContent>
      </Card>
    </div>
  );
}
