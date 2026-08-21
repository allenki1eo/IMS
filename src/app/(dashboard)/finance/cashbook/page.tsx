"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDeleteDialog } from "@/components/shared/ConfirmDeleteDialog";
import { LoadingState } from "@/components/shared/LoadingState";
import { EmptyState } from "@/components/shared/EmptyState";
import { usePermission } from "@/hooks/usePermission";
import { formatMoney } from "@/lib/format";

interface BankAccount {
  id: string;
  name: string;
  bankName: string | null;
  currency: string;
  currentBalance: number;
}

interface CashbookEntry {
  id: string;
  date: string;
  type: string;
  category: string;
  description: string;
  counterparty: string | null;
  reference: string | null;
  amount: number;
  pvNumber: number | null;
  paymentMethod: string;
  chequeRef: string | null;
  bankAccount: { id: string; name: string; bankName: string | null; currency: string; currentBalance: number };
  transferTo: { id: string; name: string; bankName: string | null } | null;
}

function fmtDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function methodBadgeColor(method: string) {
  switch (method) {
    case "CHEQUE": return "bg-blue-100 text-blue-700";
    case "ONLINE": return "bg-purple-100 text-purple-700";
    case "BANK_TRANSFER": return "bg-indigo-100 text-indigo-700";
    case "PETTY_CASH": return "bg-yellow-100 text-yellow-700";
    default: return "bg-gray-100 text-gray-600";
  }
}

export default function CashbookPage() {
  const router = useRouter();
  const canWrite = usePermission("finance:cashbook:write");

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [entries, setEntries] = useState<CashbookEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const [filterBankId, setFilterBankId] = useState("ALL");
  const [filterType, setFilterType] = useState("ALL");
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Load bank accounts
  useEffect(() => {
    fetch("/api/finance/bank-accounts?isActive=true&pageSize=100")
      .then((r) => r.json())
      .then((d) => setBankAccounts(d.data ?? []))
      .catch(() => {});
  }, []);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if (filterBankId !== "ALL") params.set("bankAccountId", filterBankId);
      if (filterType !== "ALL") params.set("type", filterType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo + "T23:59:59");
      const res = await fetch(`/api/finance/cashbook?${params}`);
      const json = await res.json();
      if (json.success) {
        setEntries(json.data?.data ?? []);
        setTotal(json.data?.meta?.total ?? 0);
      }
    } catch {
      toast.error("Failed to load entries");
    } finally {
      setLoading(false);
    }
  }, [page, filterBankId, filterType, dateFrom, dateTo]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleDelete() {
    if (!deleteId) return;
    const res = await fetch(`/api/finance/cashbook/${deleteId}`, { method: "DELETE" });
    if (res.ok || res.status === 204) {
      toast.success("Entry deleted and balance reversed");
      setDeleteId(null);
      loadEntries();
    } else {
      const d = await res.json().catch(() => ({}));
      toast.error(d.error ?? "Failed to delete entry");
    }
  }

  // Summary calculations — grouped per currency so mixed-currency amounts are never summed together
  const totalsByCurrency = (() => {
    const map = new Map<string, { receipts: number; payments: number }>();
    for (const e of entries) {
      const cur = e.bankAccount?.currency ?? "TZS";
      const t = map.get(cur) ?? { receipts: 0, payments: 0 };
      if (e.type === "RECEIPT") t.receipts += e.amount;
      if (e.type === "PAYMENT") t.payments += e.amount;
      map.set(cur, t);
    }
    return Array.from(map.entries()).map(([currency, t]) => ({
      currency,
      receipts: t.receipts,
      payments: t.payments,
      net: t.receipts - t.payments,
    }));
  })();

  const totalPages = Math.ceil(total / pageSize);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cashbook"
        description="Daily cash and bank transaction ledger"
        actions={
          canWrite ? (
            <Link href="/finance/cashbook/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Entry
              </Button>
            </Link>
          ) : undefined
        }
      />

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Bank Account</Label>
          <Select value={filterBankId} onValueChange={(v) => { setFilterBankId(v); setPage(1); }}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All accounts</SelectItem>
              {bankAccounts.map((a) => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">Type</Label>
          <Select value={filterType} onValueChange={(v) => { setFilterType(v); setPage(1); }}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              <SelectItem value="RECEIPT">Receipt</SelectItem>
              <SelectItem value="PAYMENT">Payment</SelectItem>
              <SelectItem value="TRANSFER">Transfer</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">From</Label>
          <Input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1); }} className="w-36" />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">To</Label>
          <Input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1); }} className="w-36" />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Receipts</p>
            {totalsByCurrency.length === 0 ? (
              <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(0)}</p>
            ) : (
              totalsByCurrency.map((t) => (
                <p key={t.currency} className="text-xl font-bold text-green-600 mt-1">{formatMoney(t.receipts, t.currency)}</p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Payments</p>
            {totalsByCurrency.length === 0 ? (
              <p className="text-xl font-bold text-red-600 mt-1">{formatMoney(0)}</p>
            ) : (
              totalsByCurrency.map((t) => (
                <p key={t.currency} className="text-xl font-bold text-red-600 mt-1">{formatMoney(t.payments, t.currency)}</p>
              ))
            )}
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Net Movement</p>
            {totalsByCurrency.length === 0 ? (
              <p className="text-xl font-bold text-green-600 mt-1">{formatMoney(0)}</p>
            ) : (
              totalsByCurrency.map((t) => (
                <p key={t.currency} className={`text-xl font-bold mt-1 ${t.net >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {formatMoney(t.net, t.currency)}
                </p>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* Table */}
      {loading ? (
        <LoadingState text="Loading entries..." />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No entries found"
          description="No cashbook entries match your filters."
          action={canWrite ? <Link href="/finance/cashbook/new"><Button><Plus className="mr-2 h-4 w-4" />New Entry</Button></Link> : undefined}
        />
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">PV No.</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Description</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Method</th>
                <th className="text-right px-3 py-2 font-medium text-green-700">Receipt</th>
                <th className="text-right px-3 py-2 font-medium text-red-700">Payment</th>
                <th className="text-left px-3 py-2 font-medium text-muted-foreground">Bank Account</th>
                {canWrite && <th className="px-3 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.id} className="hover:bg-muted/30 transition-colors">
                  <td className="px-3 py-2">
                    {entry.pvNumber != null ? (
                      <span className="font-bold font-mono text-xs">{entry.pvNumber}</span>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">{fmtDate(entry.date)}</td>
                  <td className="px-3 py-2 max-w-xs">
                    <span className="font-medium">{entry.description}</span>
                    {entry.counterparty && (
                      <p className="text-xs text-muted-foreground">{entry.counterparty}</p>
                    )}
                    {entry.reference && (
                      <p className="text-xs text-muted-foreground">Ref: {entry.reference}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground">{entry.category}</td>
                  <td className="px-3 py-2">
                    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium ${methodBadgeColor(entry.paymentMethod)}`}>
                      {entry.paymentMethod === "BANK_TRANSFER" ? "BANK" : entry.paymentMethod}
                    </span>
                    {entry.chequeRef && (
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.chequeRef}</p>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {entry.type === "RECEIPT" ? (
                      <span className="font-medium text-green-600">{formatMoney(entry.amount, entry.bankAccount?.currency)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {entry.type === "PAYMENT" ? (
                      <span className="font-medium text-red-600">{formatMoney(entry.amount, entry.bankAccount?.currency)}</span>
                    ) : entry.type === "TRANSFER" ? (
                      <span className="font-medium text-amber-600">{formatMoney(entry.amount, entry.bankAccount?.currency)}</span>
                    ) : "—"}
                  </td>
                  <td className="px-3 py-2 text-muted-foreground whitespace-nowrap">
                    {entry.bankAccount.name}
                    {entry.transferTo && (
                      <span className="text-xs"> → {entry.transferTo.name}</span>
                    )}
                  </td>
                  {canWrite && (
                    <td className="px-3 py-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteId(entry.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>Showing {((page - 1) * pageSize) + 1}–{Math.min(page * pageSize, total)} of {total} entries</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</Button>
          </div>
        </div>
      )}

      <ConfirmDeleteDialog
        open={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        description="This will permanently delete the entry and reverse the bank balance change."
      />
    </div>
  );
}
