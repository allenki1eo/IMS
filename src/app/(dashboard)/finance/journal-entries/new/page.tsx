"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { AlertCircle, ArrowLeft, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JournalLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

const VOUCHER_TYPES = [
  { value: "JOURNAL", label: "Journal Voucher (JV)" },
  { value: "PAYMENT", label: "Payment Voucher (PV)" },
  { value: "RECEIPT", label: "Receipt Voucher (RV)" },
  { value: "CONTRA", label: "Contra Voucher (CV)" },
  { value: "SALES", label: "Sales Invoice (SI)" },
  { value: "PURCHASE", label: "Purchase Invoice (PI)" },
  { value: "DEBIT_NOTE", label: "Debit Note (DN)" },
  { value: "CREDIT_NOTE", label: "Credit Note (CN)" },
];

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
    voucherType: "JOURNAL",
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: "", description: "", debit: "", credit: "" },
    { accountId: "", description: "", debit: "", credit: "" },
  ]);

  // Fixed: was wrongly using useState as an effect callback
  useEffect(() => {
    fetch("/api/finance/accounts?page=1&pageSize=500&isActive=true")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data || []))
      .catch(() => toast.error("Could not load accounts"));
  }, []);

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const diff = totalDebit - totalCredit;
  const isBalanced = Math.abs(diff) < 0.001 && totalDebit > 0;

  function addLine() {
    setLines([...lines, { accountId: "", description: "", debit: "", credit: "" }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) { toast.error("A journal entry needs at least 2 lines"); return; }
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent, postImmediately = false) {
    e.preventDefault();
    if (!isBalanced) { toast.error("Journal entry is not balanced"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/finance/journal-entries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          lines: lines.map((l) => ({
            ...l,
            debit: parseFloat(l.debit) || 0,
            credit: parseFloat(l.credit) || 0,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.message || "Failed to create journal entry"); return; }

      const entryId = json.data.id;

      if (postImmediately) {
        const postRes = await fetch(`/api/finance/journal-entries/${entryId}/post`, { method: "POST" });
        if (postRes.ok) {
          toast.success("Journal entry created and posted");
        } else {
          toast.success("Entry saved as draft — posting failed");
        }
      } else {
        toast.success("Journal entry saved as draft");
      }

      router.push(`/finance/journal-entries/${entryId}`);
    } catch {
      toast.error("Failed to create journal entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Link
        href="/finance/journal-entries"
        className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Journal Entries
      </Link>
      <PageHeader title="New Journal Entry" description="Create a double-entry accounting voucher" />

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-1.5">
                <Label>Voucher Type</Label>
                <select
                  value={form.voucherType}
                  onChange={(e) => setForm({ ...form, voucherType: e.target.value })}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                  required
                >
                  {VOUCHER_TYPES.map((v) => (
                    <option key={v.value} value={v.value}>{v.label}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Entry Date</Label>
                <Input
                  type="date"
                  value={form.entryDate}
                  onChange={(e) => setForm({ ...form, entryDate: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description / Narration</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Brief description of this voucher"
                  required
                />
              </div>
            </div>
            <div className="mt-4 space-y-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Additional reference notes (optional)"
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Lines */}
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b bg-muted/50">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Account</th>
                    <th className="px-4 py-3 text-left font-medium text-muted-foreground">Narration</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Debit (Dr)</th>
                    <th className="px-4 py-3 text-right font-medium text-muted-foreground">Credit (Cr)</th>
                    <th className="w-10 px-2 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, i) => (
                    <tr key={i} className="border-b">
                      <td className="px-4 py-2">
                        <select
                          value={line.accountId}
                          onChange={(e) => updateLine(i, "accountId", e.target.value)}
                          className="w-full rounded border bg-background px-2 py-1.5 text-sm"
                          required
                        >
                          <option value="">Select account…</option>
                          {accounts.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.code} — {a.name}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={line.description}
                          onChange={(e) => updateLine(i, "description", e.target.value)}
                          placeholder="Line narration"
                          className="min-w-[160px]"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-32 text-right"
                          value={line.debit}
                          onChange={(e) => updateLine(i, "debit", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="w-32 text-right"
                          value={line.credit}
                          onChange={(e) => updateLine(i, "credit", e.target.value)}
                          placeholder="0.00"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeLine(i)}
                          className="h-8 w-8"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                {/* Totals row */}
                <tfoot className="border-t bg-muted/30">
                  <tr>
                    <td colSpan={2} className="px-4 py-3 text-right text-sm font-medium">Totals</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(totalDebit)}</td>
                    <td className="px-4 py-3 text-right tabular-nums font-semibold">{fmt(totalCredit)}</td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>

        <Button type="button" variant="outline" onClick={addLine} className="gap-2">
          <Plus className="h-4 w-4" />
          Add Line
        </Button>

        {/* Balance indicator */}
        {totalDebit > 0 || totalCredit > 0 ? (
          <div
            className={`flex items-center gap-3 rounded-lg border p-4 ${
              isBalanced ? "border-emerald-300 bg-emerald-50 text-emerald-800" : "border-red-300 bg-red-50 text-red-800"
            }`}
          >
            {isBalanced ? (
              <CheckCircle2 className="h-5 w-5 shrink-0" />
            ) : (
              <AlertCircle className="h-5 w-5 shrink-0" />
            )}
            <div className="text-sm">
              {isBalanced ? (
                <span className="font-medium">Balanced — Dr {fmt(totalDebit)} = Cr {fmt(totalCredit)}</span>
              ) : (
                <span className="font-medium">
                  Out of balance by {fmt(Math.abs(diff))} &nbsp;·&nbsp; Dr {fmt(totalDebit)} vs Cr {fmt(totalCredit)}
                </span>
              )}
            </div>
          </div>
        ) : null}

        {/* Action buttons */}
        <div className="flex gap-3">
          <Button type="submit" disabled={loading || !isBalanced}>
            {loading ? "Saving…" : "Save as Draft"}
          </Button>
          <Button
            type="button"
            variant="default"
            disabled={loading || !isBalanced}
            onClick={(e) => handleSubmit(e as any, true)}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            {loading ? "Saving…" : "Save & Post"}
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/finance/journal-entries">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
