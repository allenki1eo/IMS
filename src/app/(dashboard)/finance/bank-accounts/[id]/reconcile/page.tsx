"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  RefreshCw,
  Scale,
} from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface BankTx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  reference: string | null;
  counterparty: string | null;
  transactionDate: string;
  cleared: boolean;
  clearedAt: string | null;
}

interface TxnSummary {
  clearedTotal: number;
  unclearedTotal: number;
  clearedCount: number;
  unclearedCount: number;
  totalCount: number;
}

function fmt(n: number) {
  return n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(s: string) {
  return new Date(s).toLocaleDateString(undefined, { day: "2-digit", month: "short", year: "numeric" });
}

export default function BankReconcilePage() {
  const { id } = useParams<{ id: string }>();
  const [account, setAccount] = useState<any>(null);
  const [summary, setSummary] = useState<TxnSummary | null>(null);
  const [transactions, setTransactions] = useState<BankTx[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [statementBalance, setStatementBalance] = useState("");
  const [filterCleared, setFilterCleared] = useState<"all" | "uncleared" | "cleared">("all");

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [accRes, txRes, sumRes] = await Promise.all([
        fetch(`/api/finance/bank-accounts/${id}`),
        fetch(`/api/finance/bank-accounts/${id}/transactions?page=1&pageSize=500`),
        fetch(`/api/finance/bank-accounts/${id}/transactions?summary=true`),
      ]);
      const [accJson, txJson, sumJson] = await Promise.all([accRes.json(), txRes.json(), sumRes.json()]);
      if (accRes.ok) setAccount(accJson.data);
      if (txRes.ok) setTransactions(txJson.data ?? []);
      if (sumRes.ok) setSummary(sumJson.data ?? null);
    } catch {
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const refreshSummary = useCallback(async () => {
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}/transactions?summary=true`);
      const json = await res.json();
      if (res.ok) setSummary(json.data ?? null);
    } catch {
      // summary refresh is non-blocking
    }
  }, [id]);

  async function toggleCleared(tx: BankTx) {
    setToggling(tx.id);
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}/transactions/${tx.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          isCleared: !tx.cleared,
          clearedAt: !tx.cleared ? new Date().toISOString() : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update"); return; }
      setTransactions((prev) =>
        prev.map((t) => (t.id === tx.id ? { ...t, cleared: !t.cleared, clearedAt: json.data?.clearedAt ?? null } : t))
      );
      refreshSummary();
    } catch {
      toast.error("Network error");
    } finally {
      setToggling(null);
    }
  }

  const filtered = useMemo(() => {
    if (filterCleared === "cleared") return transactions.filter((t) => t.cleared);
    if (filterCleared === "uncleared") return transactions.filter((t) => !t.cleared);
    return transactions;
  }, [transactions, filterCleared]);

  // Balances come from DB aggregates over ALL transactions, not the loaded page.
  // The account's currentBalance is authoritative (it includes the opening balance
  // and is incremented by every transaction), so:
  //   book balance    = currentBalance
  //   cleared balance = currentBalance - uncleared movement
  const bookBalance = account?.currentBalance ?? 0;
  const unclearedTotal = summary?.unclearedTotal ?? 0;
  const clearedBalance = bookBalance - unclearedTotal;
  const clearedCount = summary?.clearedCount ?? 0;
  const unclearedCount = summary?.unclearedCount ?? 0;
  const stmtBal = parseFloat(statementBalance) || 0;
  const difference = stmtBal - clearedBalance;
  const isReconciled = Math.abs(difference) < 0.01;

  if (loading) return <LoadingState />;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/finance/bank-accounts/${id}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <PageHeader
          title={`Reconcile — ${account?.name ?? "Bank Account"}`}
          description="Match your book transactions against your bank statement"
        />
      </div>

      {/* Summary cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Book Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">{fmt(bookBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">All transactions</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Cleared Balance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-emerald-700">{fmt(clearedBalance)}</div>
            <p className="text-xs text-muted-foreground mt-1">{clearedCount} cleared</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Uncleared Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums text-amber-700">{unclearedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Pending reconciliation</p>
          </CardContent>
        </Card>

        <Card className={`border-l-4 ${isReconciled ? "border-l-emerald-500" : "border-l-red-500"}`}>
          <CardHeader className="pb-1">
            <CardTitle className="text-xs font-medium text-muted-foreground">Difference</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold tabular-nums ${isReconciled ? "text-emerald-700" : "text-red-700"}`}>
              {fmt(difference)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {isReconciled ? "Reconciled ✓" : "Statement vs cleared"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Statement balance input + reconciliation status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" />
            Reconciliation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap items-end gap-6">
            <div className="space-y-1.5">
              <Label>Bank Statement Closing Balance</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="Enter statement balance"
                value={statementBalance}
                onChange={(e) => setStatementBalance(e.target.value)}
                className="w-52"
              />
              <p className="text-xs text-muted-foreground">Enter the closing balance from your bank statement</p>
            </div>

            <div className="space-y-1 text-sm">
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Statement Balance</span>
                <span className="tabular-nums font-medium">{fmt(stmtBal)}</span>
              </div>
              <div className="flex justify-between gap-8">
                <span className="text-muted-foreground">Less: Cleared Balance</span>
                <span className="tabular-nums font-medium">{fmt(clearedBalance)}</span>
              </div>
              <div className={`flex justify-between gap-8 border-t pt-1 font-bold ${isReconciled ? "text-emerald-700" : "text-red-700"}`}>
                <span>Difference</span>
                <span className="tabular-nums">{fmt(difference)}</span>
              </div>
              {isReconciled && statementBalance && (
                <div className="mt-2 flex items-center gap-1.5 text-emerald-700">
                  <CheckCircle2 className="h-4 w-4" />
                  <span className="text-sm font-medium">Account reconciled</span>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transactions table */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Transactions</CardTitle>
            <div className="flex gap-2">
              {(["all", "uncleared", "cleared"] as const).map((f) => (
                <Button
                  key={f}
                  size="sm"
                  variant={filterCleared === f ? "default" : "outline"}
                  onClick={() => setFilterCleared(f)}
                  className="capitalize"
                >
                  {f}
                </Button>
              ))}
              <Button size="sm" variant="outline" onClick={fetchData}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-y bg-muted/50">
                <tr>
                  <th className="w-10 px-4 py-3 text-center font-medium text-muted-foreground">✓</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Date</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Reference</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Deposits</th>
                  <th className="px-4 py-3 text-right font-medium text-muted-foreground">Withdrawals</th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => (
                    <tr
                      key={tx.id}
                      className={`border-b transition-colors ${
                        tx.cleared ? "bg-emerald-50/40 dark:bg-emerald-950/10" : "hover:bg-muted/30"
                      }`}
                    >
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => toggleCleared(tx)}
                          disabled={toggling === tx.id}
                          className="inline-flex items-center justify-center rounded transition-colors hover:text-emerald-600"
                          title={tx.cleared ? "Mark as uncleared" : "Mark as cleared"}
                        >
                          {toggling === tx.id ? (
                            <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />
                          ) : tx.cleared ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{fmtDate(tx.transactionDate)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{tx.reference ?? "—"}</td>
                      <td className="max-w-[260px] truncate px-4 py-3">
                        {tx.description || tx.counterparty || "—"}
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={tx.type === "DEPOSIT" ? "default" : "secondary"}>
                          {tx.type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-emerald-700">
                        {tx.type === "DEPOSIT" ? fmt(tx.amount) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-red-700">
                        {tx.type !== "DEPOSIT" ? fmt(tx.amount) : "—"}
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
