"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CASHBOOK_CATEGORIES } from "@/modules/finance/cashbook.service";

type EntryType = "RECEIPT" | "PAYMENT" | "TRANSFER";

interface BankAccount {
  id: string;
  name: string;
  bankName: string | null;
  currency: string;
  currentBalance: number;
}

export default function NewCashbookEntryPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  const [type, setType] = useState<EntryType>("RECEIPT");
  const [bankAccountId, setBankAccountId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [counterparty, setCounterparty] = useState("");
  const [amount, setAmount] = useState("");
  const [transferToId, setTransferToId] = useState("");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    fetch("/api/finance/bank-accounts?isActive=true&pageSize=100")
      .then((r) => r.json())
      .then((d) => setBankAccounts(d.data ?? []))
      .catch(() => {});
  }, []);

  // Reset category when type changes
  useEffect(() => {
    setCategory("");
  }, [type]);

  const categories = CASHBOOK_CATEGORIES[type] as readonly string[];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankAccountId) { toast.error("Please select a bank account"); return; }
    if (!category) { toast.error("Please select a category"); return; }
    if (!description.trim()) { toast.error("Description is required"); return; }
    if (!amount || Number(amount) <= 0) { toast.error("Amount must be positive"); return; }
    if (type === "TRANSFER" && !transferToId) { toast.error("Please select destination account"); return; }
    if (type === "TRANSFER" && transferToId === bankAccountId) { toast.error("Transfer source and destination must differ"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/cashbook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bankAccountId,
          date,
          type,
          category,
          description: description.trim(),
          counterparty: counterparty.trim() || null,
          amount: Number(amount),
          transferToId: type === "TRANSFER" ? transferToId : null,
          reference: reference.trim() || null,
          notes: notes.trim() || null,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Cashbook entry saved");
        router.push("/finance/cashbook");
      } else {
        toast.error(json.error ?? "Failed to save entry");
      }
    } catch {
      toast.error("Failed to save entry");
    } finally {
      setSubmitting(false);
    }
  }

  const selectedAccount = bankAccounts.find((a) => a.id === bankAccountId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <PageHeader title="New Cashbook Entry" description="Record a receipt, payment, or bank transfer" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Type Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transaction Type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-3">
              {(["RECEIPT", "PAYMENT", "TRANSFER"] as EntryType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                    type === t
                      ? t === "RECEIPT"
                        ? "border-green-500 bg-green-50 text-green-700"
                        : t === "PAYMENT"
                        ? "border-red-500 bg-red-50 text-red-700"
                        : "border-amber-500 bg-amber-50 text-amber-700"
                      : "border-border bg-background text-muted-foreground hover:border-muted-foreground"
                  }`}
                >
                  {t === "RECEIPT" ? "Receipt (In)" : t === "PAYMENT" ? "Payment (Out)" : "Transfer"}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Main Fields */}
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Bank Account */}
              <div className="space-y-1">
                <Label>Bank Account *</Label>
                <Select value={bankAccountId} onValueChange={setBankAccountId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.name} {a.bankName ? `— ${a.bankName}` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedAccount && (
                  <p className="text-xs text-muted-foreground">
                    Balance: {selectedAccount.currency} {selectedAccount.currentBalance.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                )}
              </div>

              {/* Date */}
              <div className="space-y-1">
                <Label>Date *</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
            </div>

            {/* Transfer To (only for TRANSFER) */}
            {type === "TRANSFER" && (
              <div className="space-y-1">
                <Label>Transfer To *</Label>
                <Select value={transferToId} onValueChange={setTransferToId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select destination account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts
                      .filter((a) => a.id !== bankAccountId)
                      .map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name} {a.bankName ? `— ${a.bankName}` : ""}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Category */}
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <Label>Description *</Label>
              <Input
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of the transaction"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Counterparty */}
              <div className="space-y-1">
                <Label>{type === "RECEIPT" ? "Received From" : type === "PAYMENT" ? "Paid To" : "Initiated By"}</Label>
                <Input
                  value={counterparty}
                  onChange={(e) => setCounterparty(e.target.value)}
                  placeholder={type === "RECEIPT" ? "Customer / payer name" : type === "PAYMENT" ? "Supplier / payee name" : ""}
                />
              </div>

              {/* Amount */}
              <div className="space-y-1">
                <Label>Amount (TZS) *</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  required
                />
              </div>
            </div>

            {/* Reference */}
            <div className="space-y-1">
              <Label>Reference / Invoice Number</Label>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Optional reference number"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional additional notes"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex gap-3 justify-end">
          <Button type="button" variant="outline" onClick={() => router.push("/finance/cashbook")}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? "Saving..." : "Save Entry"}
          </Button>
        </div>
      </form>
    </div>
  );
}
