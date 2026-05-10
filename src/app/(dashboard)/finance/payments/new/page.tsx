"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAYMENT_METHODS = ["CASH", "BANK_TRANSFER", "CHECK", "MOBILE_MONEY"];

export default function NewPaymentPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    type: "PAYMENT",
    partyName: "",
    amount: "",
    currency: "USD",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    bankAccountId: "",
    reference: "",
    notes: "",
  });

  useEffect(() => {
    fetch("/api/finance/bank-accounts?page=1&pageSize=100&isActive=true")
      .then((r) => r.json())
      .then((json) => setBankAccounts(json.data || []))
      .catch(() => {});
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          amount: parseFloat(form.amount) || 0,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Payment created");
        router.push(`/finance/payments/${json.data.id}`);
      } else {
        toast.error(json.message || "Failed to create payment");
      }
    } catch {
      toast.error("Failed to create payment");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/finance/payments" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Payments
      </Link>
      <PageHeader title="New Payment / Receipt" description="Record a payment or receipt" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Type *</Label>
            <Select value={form.type} onValueChange={(v) => setForm({ ...form, type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="PAYMENT">Payment</SelectItem>
                <SelectItem value="RECEIPT">Receipt</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="partyName">Party Name *</Label>
            <Input id="partyName" value={form.partyName} onChange={(e) => setForm({ ...form, partyName: e.target.value })} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Date *</Label>
            <Input id="paymentDate" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Payment Method *</Label>
            <Select value={form.paymentMethod} onValueChange={(v) => setForm({ ...form, paymentMethod: v })}>
              <SelectTrigger><SelectValue placeholder="Select method" /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map((m) => (
                  <SelectItem key={m} value={m}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Bank Account</Label>
            <Select value={form.bankAccountId} onValueChange={(v) => setForm({ ...form, bankAccountId: v })}>
              <SelectTrigger><SelectValue placeholder="Select account" /></SelectTrigger>
              <SelectContent>
                {bankAccounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reference">Reference</Label>
          <Input id="reference" value={form.reference} onChange={(e) => setForm({ ...form, reference: e.target.value })} />
        </div>

        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Payment"}</Button>
      </form>
    </div>
  );
}
