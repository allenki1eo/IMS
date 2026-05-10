"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface JournalLine {
  accountId: string;
  description: string;
  debit: string;
  credit: string;
}

export default function NewJournalEntryPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    entryDate: new Date().toISOString().split("T")[0],
    description: "",
    notes: "",
  });
  const [lines, setLines] = useState<JournalLine[]>([
    { accountId: "", description: "", debit: "", credit: "" },
    { accountId: "", description: "", debit: "", credit: "" },
  ]);

  useState(() => {
    fetch("/api/finance/accounts?page=1&pageSize=500&isActive=true")
      .then((r) => r.json())
      .then((json) => setAccounts(json.data || []))
      .catch(() => {});
  });

  const totalDebit = lines.reduce((sum, l) => sum + (parseFloat(l.debit) || 0), 0);
  const totalCredit = lines.reduce((sum, l) => sum + (parseFloat(l.credit) || 0), 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.001;

  function addLine() {
    setLines([...lines, { accountId: "", description: "", debit: "", credit: "" }]);
  }

  function removeLine(index: number) {
    setLines(lines.filter((_, i) => i !== index));
  }

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    const updated = [...lines];
    updated[index][field] = value;
    setLines(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) {
      toast.error("Journal entry is not balanced");
      return;
    }
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
      if (res.ok) {
        toast.success("Journal entry created");
        router.push(`/finance/journal-entries/${json.data.id}`);
      } else {
        toast.error(json.message || "Failed to create journal entry");
      }
    } catch {
      toast.error("Failed to create journal entry");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/finance/journal-entries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Journal Entries
      </Link>
      <PageHeader title="New Journal Entry" description="Create a new double-entry journal" />

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Entry Date *</Label>
            <Input type="date" value={form.entryDate} onChange={(e) => setForm({ ...form, entryDate: e.target.value })} required />
          </div>
          <div className="space-y-2">
            <Label>Description *</Label>
            <Input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Notes</Label>
          <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>Lines</Label>
            <div className={`text-sm font-medium ${isBalanced ? "text-green-600" : "text-red-600"}`}>
              Debit: ${totalDebit.toLocaleString()} | Credit: ${totalCredit.toLocaleString()}
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-4 py-2 text-left">Account</th>
                  <th className="px-4 py-2 text-left">Description</th>
                  <th className="px-4 py-2 text-right">Debit</th>
                  <th className="px-4 py-2 text-right">Credit</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="border-t">
                    <td className="px-4 py-2">
                      <select
                        value={line.accountId}
                        onChange={(e) => updateLine(i, "accountId", e.target.value)}
                        className="w-full border rounded px-2 py-1"
                        required
                      >
                        <option value="">Select account</option>
                        {accounts.map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.code} - {a.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2">
                      <Input value={line.description} onChange={(e) => updateLine(i, "description", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="number" step="0.01" className="text-right" value={line.debit} onChange={(e) => updateLine(i, "debit", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <Input type="number" step="0.01" className="text-right" value={line.credit} onChange={(e) => updateLine(i, "credit", e.target.value)} />
                    </td>
                    <td className="px-4 py-2">
                      <Button type="button" variant="ghost" size="sm" onClick={() => removeLine(i)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Button type="button" variant="outline" onClick={addLine}>
            <Plus className="mr-2 h-4 w-4" />
            Add Line
          </Button>
        </div>

        <Button type="submit" disabled={loading || !isBalanced}>
          {loading ? "Creating..." : "Create Journal Entry"}
        </Button>
      </form>
    </div>
  );
}
