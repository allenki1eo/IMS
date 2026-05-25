"use client";

import { useState } from "react";
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

const ACCOUNT_TYPES = ["BANK", "CASH", "MOBILE_MONEY"];

export default function NewBankAccountPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    accountNumber: "",
    bankName: "",
    branch: "",
    currency: "USD",
    accountType: "",
    currentBalance: "0",
  });

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/finance/bank-accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          currentBalance: parseFloat(form.currentBalance) || 0,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Bank account created");
        router.push(`/finance/bank-accounts/${json.data.id}`);
      } else {
        toast.error(json.message || "Failed to create bank account");
      }
    } catch {
      toast.error("Failed to create bank account");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <Link href="/finance/bank-accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Bank Accounts
      </Link>
      <PageHeader title="New Bank Account" description="Add a new bank or cash account" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Account Name *</Label>
          <Input id="name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="bankName">Bank Name</Label>
            <Input id="bankName" value={form.bankName} onChange={(e) => setForm({ ...form, bankName: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account Number</Label>
            <Input id="accountNumber" value={form.accountNumber} onChange={(e) => setForm({ ...form, accountNumber: e.target.value })} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Account Type *</Label>
            <Select value={form.accountType} onValueChange={(v) => setForm({ ...form, accountType: v })}>
              <SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger>
              <SelectContent>
                {ACCOUNT_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="currency">Currency</Label>
            <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="currentBalance">Opening Balance</Label>
          <Input id="currentBalance" type="number" step="0.01" value={form.currentBalance} onChange={(e) => setForm({ ...form, currentBalance: e.target.value })} />
        </div>

        <Button type="submit" disabled={loading}>{loading ? "Creating..." : "Create Bank Account"}</Button>
      </form>
    </div>
  );
}
