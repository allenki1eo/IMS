"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CASHBOOK_CATEGORIES, PAYMENT_METHODS } from "@/modules/finance/cashbook.service";

type EntryType = "RECEIPT" | "PAYMENT" | "TRANSFER";

interface BankAccount {
  id: string;
  name: string;
  bankName: string | null;
  currency: string;
  currentBalance: number;
}

interface RowState {
  id: string;
  description: string;
  counterparty: string;
  category: string;
  paymentMethod: string;
  chequeRef: string;
  amount: string;
  bankAccountId: string;
  transferToId: string;
}

function makeRow(defaultBankAccountId = ""): RowState {
  return {
    id: Math.random().toString(36).slice(2, 9),
    description: "",
    counterparty: "",
    category: "",
    paymentMethod: "CASH",
    chequeRef: "",
    amount: "",
    bankAccountId: defaultBankAccountId,
    transferToId: "",
  };
}

const INITIAL_ROWS = 5;

function showChequeRef(method: string) {
  return method === "CHEQUE" || method === "ONLINE" || method === "BANK_TRANSFER";
}

export default function BatchCashbookEntryPage() {
  const router = useRouter();
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [type, setType] = useState<EntryType>("PAYMENT");
  const [globalDate, setGlobalDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [globalBankAccountId, setGlobalBankAccountId] = useState("");
  const [rows, setRows] = useState<RowState[]>(() => Array.from({ length: INITIAL_ROWS }, () => makeRow()));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/finance/bank-accounts?isActive=true&pageSize=100")
      .then((r) => r.json())
      .then((d) => {
        const accounts: BankAccount[] = d.data ?? [];
        setBankAccounts(accounts);
        if (accounts.length > 0) {
          setGlobalBankAccountId(accounts[0].id);
          setRows(Array.from({ length: INITIAL_ROWS }, () => makeRow(accounts[0].id)));
        }
      })
      .catch(() => {});
  }, []);

  // When global bank account changes, update rows that still have the old default
  const handleGlobalBankChange = (id: string) => {
    setGlobalBankAccountId(id);
    setRows((prev) =>
      prev.map((row) => ({
        ...row,
        bankAccountId: row.bankAccountId === globalBankAccountId || row.bankAccountId === "" ? id : row.bankAccountId,
      }))
    );
  };

  // When type changes, reset categories in all rows
  const handleTypeChange = (t: EntryType) => {
    setType(t);
    setRows((prev) => prev.map((row) => ({ ...row, category: "" })));
  };

  const updateRow = useCallback((id: string, field: keyof RowState, value: string) => {
    setRows((prev) =>
      prev.map((row) =>
        row.id === id
          ? {
              ...row,
              [field]: value,
              // Reset chequeRef when method changes
              ...(field === "paymentMethod" ? { chequeRef: "" } : {}),
            }
          : row
      )
    );
  }, []);

  const addRow = () => {
    setRows((prev) => [...prev, makeRow(globalBankAccountId)]);
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      if (prev.length <= 1) return prev;
      return prev.filter((r) => r.id !== id);
    });
  };

  const categories = CASHBOOK_CATEGORIES[type] as readonly string[];

  const runningTotal = rows.reduce((sum, row) => {
    const amt = parseFloat(row.amount);
    return sum + (isNaN(amt) ? 0 : amt);
  }, 0);

  const fmtAmount = (n: number) =>
    n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  async function handleSubmit() {
    // Filter out fully blank rows
    const toSubmit = rows.filter((row) => row.description.trim() || row.amount.trim());

    // Validate partial rows
    for (const row of toSubmit) {
      if (row.description.trim() && !row.amount.trim()) {
        toast.error(`Row "${row.description}" is missing an amount`);
        return;
      }
      if (row.amount.trim() && !row.description.trim()) {
        toast.error(`A row with amount ${row.amount} is missing a description`);
        return;
      }
      if (!row.category) {
        toast.error(`Row "${row.description}" is missing a category`);
        return;
      }
      if (!row.bankAccountId) {
        toast.error(`Row "${row.description}" is missing a bank account`);
        return;
      }
      const amt = parseFloat(row.amount);
      if (isNaN(amt) || amt <= 0) {
        toast.error(`Row "${row.description}" has an invalid amount`);
        return;
      }
      if (type === "TRANSFER" && !row.transferToId) {
        toast.error(`Row "${row.description}" needs a transfer destination`);
        return;
      }
    }

    if (toSubmit.length === 0) {
      toast.error("No entries to submit");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/cashbook/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entries: toSubmit.map((row) => ({
            bankAccountId: row.bankAccountId,
            date: globalDate,
            type,
            category: row.category,
            description: row.description.trim(),
            counterparty: row.counterparty.trim() || null,
            paymentMethod: row.paymentMethod,
            chequeRef: showChequeRef(row.paymentMethod) ? row.chequeRef.trim() || null : null,
            amount: parseFloat(row.amount),
            transferToId: type === "TRANSFER" ? row.transferToId || null : null,
          })),
        }),
      });

      const json = await res.json();
      if (res.ok) {
        const { count, firstPV, lastPV } = json.data ?? {};
        toast.success(
          count
            ? `${count} entries saved — PV #${firstPV} to #${lastPV}`
            : "Batch entries saved"
        );
        router.push("/finance/cashbook");
      } else {
        toast.error(json.error ?? "Failed to save entries");
      }
    } catch {
      toast.error("Failed to save entries");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Batch Cashbook Entry"
        description="Enter multiple cashbook transactions at once"
      />

      {/* Global Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Batch Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            {/* Type Toggle */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Transaction Type</Label>
              <div className="flex gap-2">
                {(["PAYMENT", "RECEIPT", "TRANSFER"] as EntryType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTypeChange(t)}
                    className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all ${
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
            </div>

            {/* Date */}
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date (applies to all rows)</Label>
              <Input
                type="date"
                value={globalDate}
                onChange={(e) => setGlobalDate(e.target.value)}
                className="w-40"
              />
            </div>

            {/* Default Bank Account */}
            <div className="space-y-1 min-w-[200px]">
              <Label className="text-xs text-muted-foreground">Default Bank Account</Label>
              <Select value={globalBankAccountId} onValueChange={handleGlobalBankChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select account" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}{a.bankName ? ` — ${a.bankName}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Spreadsheet Table */}
      <Card>
        <CardContent className="pt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-muted-foreground text-xs">
                <th className="text-left py-2 px-2 w-8">#</th>
                <th className="text-left py-2 px-2">Description *</th>
                <th className="text-left py-2 px-2 w-36">Counterparty</th>
                <th className="text-left py-2 px-2 w-40">Category *</th>
                <th className="text-left py-2 px-2 w-36">Method</th>
                <th className="text-left py-2 px-2 w-32">Cheque/Ref</th>
                <th className="text-left py-2 px-2 w-36">Bank Account</th>
                {type === "TRANSFER" && (
                  <th className="text-left py-2 px-2 w-36">Transfer To</th>
                )}
                <th className="text-right py-2 px-2 w-36">Amount (TZS) *</th>
                <th className="w-8 py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row, idx) => (
                <tr key={row.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="py-1.5 px-2 text-muted-foreground">{idx + 1}</td>

                  {/* Description */}
                  <td className="py-1.5 px-1">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, "description", e.target.value)}
                      placeholder="Description"
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Counterparty */}
                  <td className="py-1.5 px-1">
                    <Input
                      value={row.counterparty}
                      onChange={(e) => updateRow(row.id, "counterparty", e.target.value)}
                      placeholder="Counterparty"
                      className="h-8 text-sm"
                    />
                  </td>

                  {/* Category */}
                  <td className="py-1.5 px-1">
                    <Select
                      value={row.category}
                      onValueChange={(v) => updateRow(row.id, "category", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Category" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((c) => (
                          <SelectItem key={c} value={c}>{c}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Payment Method */}
                  <td className="py-1.5 px-1">
                    <Select
                      value={row.paymentMethod}
                      onValueChange={(v) => updateRow(row.id, "paymentMethod", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PAYMENT_METHODS.map((m) => (
                          <SelectItem key={m} value={m}>
                            {m === "BANK_TRANSFER" ? "Bank Transfer" : m === "PETTY_CASH" ? "Petty Cash" : m.charAt(0) + m.slice(1).toLowerCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Cheque/Ref */}
                  <td className="py-1.5 px-1">
                    {showChequeRef(row.paymentMethod) ? (
                      <Input
                        value={row.chequeRef}
                        onChange={(e) => updateRow(row.id, "chequeRef", e.target.value)}
                        placeholder={row.paymentMethod === "CHEQUE" ? "Cheque No." : "Ref No."}
                        className="h-8 text-sm"
                      />
                    ) : (
                      <span className="text-muted-foreground text-xs px-2">—</span>
                    )}
                  </td>

                  {/* Bank Account (per-row override) */}
                  <td className="py-1.5 px-1">
                    <Select
                      value={row.bankAccountId}
                      onValueChange={(v) => updateRow(row.id, "bankAccountId", v)}
                    >
                      <SelectTrigger className="h-8 text-sm">
                        <SelectValue placeholder="Account" />
                      </SelectTrigger>
                      <SelectContent>
                        {bankAccounts.map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Transfer To */}
                  {type === "TRANSFER" && (
                    <td className="py-1.5 px-1">
                      <Select
                        value={row.transferToId}
                        onValueChange={(v) => updateRow(row.id, "transferToId", v)}
                      >
                        <SelectTrigger className="h-8 text-sm">
                          <SelectValue placeholder="To account" />
                        </SelectTrigger>
                        <SelectContent>
                          {bankAccounts
                            .filter((a) => a.id !== row.bankAccountId)
                            .map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </td>
                  )}

                  {/* Amount */}
                  <td className="py-1.5 px-1">
                    <Input
                      type="number"
                      min="0.01"
                      step="0.01"
                      value={row.amount}
                      onChange={(e) => updateRow(row.id, "amount", e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-sm text-right"
                    />
                  </td>

                  {/* Remove */}
                  <td className="py-1.5 px-1">
                    <button
                      type="button"
                      onClick={() => removeRow(row.id)}
                      className="text-muted-foreground hover:text-red-500 transition-colors"
                      disabled={rows.length <= 1}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="flex items-center justify-between mt-3 pt-3 border-t">
            <Button type="button" variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-1" />
              Add Row
            </Button>

            <div className="text-sm text-muted-foreground">
              Running Total:{" "}
              <span className="font-bold text-base text-foreground">
                TZS {fmtAmount(runningTotal)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push("/finance/cashbook")}
        >
          Cancel
        </Button>
        <Button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
        >
          {submitting ? "Saving..." : "Save All"}
        </Button>
      </div>
    </div>
  );
}
