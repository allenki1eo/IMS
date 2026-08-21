"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const prefillAmount = searchParams.get("amount") ?? "";
  const prefillCounterparty = searchParams.get("counterparty") ?? "";
  const prefillReference = searchParams.get("referenceId") ?? "";
  const [loading, setLoading] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [exchangeRate, setExchangeRate] = useState<number | null>(null);
  const [baseAmount, setBaseAmount] = useState<number | null>(null);
  const [rateLoading, setRateLoading] = useState(false);
  const CURRENCIES = ["TZS", "USD", "EUR", "GBP"];
  const [form, setForm] = useState({
    type: "PAYMENT",
    partyName: prefillCounterparty,
    amount: prefillAmount,
    currency: "TZS",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "",
    bankAccountId: "",
    reference: prefillReference,
    notes: "",
  });

  useEffect(() => {
    fetch("/api/finance/bank-accounts?page=1&pageSize=100&isActive=true")
      .then((r) => r.json())
      .then((json) => setBankAccounts(json.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    const amt = parseFloat(form.amount) || 0;
    if (form.currency === "TZS" || !amt) {
      setExchangeRate(null);
      setBaseAmount(null);
      return;
    }
    setRateLoading(true);
    fetch(`/api/finance/exchange-rates/latest?from=${form.currency}&to=TZS`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          setExchangeRate(json.data.rate);
          setBaseAmount(amt * json.data.rate);
        } else {
          setExchangeRate(null);
          setBaseAmount(null);
        }
      })
      .catch(() => { setExchangeRate(null); setBaseAmount(null); })
      .finally(() => setRateLoading(false));
  }, [form.currency, form.amount]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.paymentMethod) {
      toast.error("Please select a payment method");
      return;
    }
    if (form.currency !== "TZS" && exchangeRate == null) {
      toast.error(
        rateLoading
          ? "Exchange rate is still loading. Please wait a moment and try again."
          : `No exchange rate found for ${form.currency}. Record a rate before creating this payment.`
      );
      return;
    }
    setLoading(true);
    try {
      const body: any = {
        ...form,
        amount: parseFloat(form.amount) || 0,
      };
      if (form.currency !== "TZS" && exchangeRate != null) {
        body.exchangeRate = exchangeRate;
        body.baseCurrencyAmount = baseAmount;
      }
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
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
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount *</Label>
            <Input id="amount" type="number" step="0.01" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Currency</Label>
            <Select value={form.currency} onValueChange={(v) => setForm({ ...form, currency: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c} value={c}>{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="paymentDate">Date *</Label>
            <Input id="paymentDate" type="date" value={form.paymentDate} onChange={(e) => setForm({ ...form, paymentDate: e.target.value })} required />
          </div>
        </div>
        {form.currency !== "TZS" && (
          <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Exchange Rate</span>
              <span className="font-medium">{rateLoading ? "Loading..." : exchangeRate != null ? `${exchangeRate.toLocaleString()} TZS/${form.currency}` : "No rate found"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Base Amount (TZS)</span>
              <span className="font-medium">{baseAmount != null ? baseAmount.toLocaleString(undefined, { style: "currency", currency: "TZS" }) : "—"}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
