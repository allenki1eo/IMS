"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Power, PowerOff, CheckCircle, Circle, Scale } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { useCurrency } from "@/hooks/useCurrency";

interface TxnSummary {
  clearedTotal: number;
  unclearedTotal: number;
  clearedCount: number;
  unclearedCount: number;
  totalCount: number;
}

export default function BankAccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState<any>(null);
  const [summary, setSummary] = useState<TxnSummary | null>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [txnLoading, setTxnLoading] = useState(false);
  const [reconcileFilter, setReconcileFilter] = useState<"all" | "cleared" | "uncleared">("all");
  const canUpdate = usePermission("finance:bank:update");
  const currency = useCurrency();

  async function fetchAccount() {
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}`);
      const json = await res.json();
      if (res.ok) {
        setAccount(json.data);
      } else {
        toast.error(json.message || "Bank account not found");
      }
    } catch {
      toast.error("Failed to load bank account");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSummary() {
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}/transactions?summary=true`);
      const json = await res.json();
      if (res.ok) setSummary(json.data ?? null);
    } catch {
      // summary is non-blocking
    }
  }

  async function fetchTransactions() {
    setTxnLoading(true);
    try {
      let url = `/api/finance/bank-accounts/${id}/transactions?page=1&pageSize=100`;
      if (reconcileFilter === "cleared") url += "&isCleared=true";
      if (reconcileFilter === "uncleared") url += "&isCleared=false";
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setTransactions(json.data || []);
      }
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setTxnLoading(false);
    }
  }

  useEffect(() => {
    fetchAccount();
    fetchSummary();
  }, [id]);

  useEffect(() => {
    fetchTransactions();
  }, [id, reconcileFilter]);

  async function toggleStatus() {
    if (!account) return;
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.data.isActive ? "Activated" : "Deactivated");
        fetchAccount();
      } else {
        toast.error(json.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  async function toggleCleared(txnId: string, current: boolean) {
    try {
      const res = await fetch(`/api/finance/bank-accounts/${id}/transactions/${txnId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isCleared: !current, clearedAt: new Date().toISOString().split("T")[0] }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.data.isCleared ? "Transaction cleared" : "Transaction uncleared");
        fetchTransactions();
        fetchSummary();
      } else {
        toast.error(json.message || "Failed to update");
      }
    } catch {
      toast.error("Failed to update transaction");
    }
  }

  // Aggregates computed in the database over ALL transactions (not just the loaded page)
  const bookBalance = account?.currentBalance ?? 0;
  const unclearedTotal = summary?.unclearedTotal ?? 0;
  const clearedBalance = bookBalance - unclearedTotal;

  if (loading) return <LoadingState text="Loading bank account..." />;
  if (!account) return <div className="text-muted-foreground">Bank account not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/finance/bank-accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Bank Accounts
      </Link>

      <div className="flex items-center justify-between">
        <PageHeader title={account.name} description={account.bankName || "Bank / Cash account"} />
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href={`/finance/bank-accounts/${id}/reconcile`}>
              <Scale className="mr-2 h-4 w-4" />
              Reconcile
            </Link>
          </Button>
          {canUpdate && (
            <Button variant="outline" onClick={toggleStatus}>
              {account.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
              {account.isActive ? "Deactivate" : "Activate"}
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Type</CardTitle></CardHeader><CardContent><Badge>{account.accountType}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Account Number</CardTitle></CardHeader><CardContent>{account.accountNumber || "-"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Currency</CardTitle></CardHeader><CardContent>{account.currency}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currency} {(account.currentBalance ?? 0).toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Bank Reconciliation</span>
            <div className="flex gap-2">
              <select
                value={reconcileFilter}
                onChange={(e) => setReconcileFilter(e.target.value as any)}
                className="border rounded px-3 py-1 text-sm"
              >
                <option value="all">All Transactions</option>
                <option value="cleared">Cleared</option>
                <option value="uncleared">Uncleared</option>
              </select>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
            <div className="bg-muted p-3 rounded"><div className="text-muted-foreground">Book Balance</div><div className="text-lg font-bold">{currency} {bookBalance.toLocaleString()}</div></div>
            <div className="bg-green-50 p-3 rounded"><div className="text-muted-foreground">Cleared Balance</div><div className="text-lg font-bold text-green-700">{currency} {clearedBalance.toLocaleString()}</div></div>
            <div className="bg-amber-50 p-3 rounded"><div className="text-muted-foreground">Uncleared ({summary?.unclearedCount ?? 0})</div><div className="text-lg font-bold text-amber-700">{currency} {unclearedTotal.toLocaleString()}</div></div>
          </div>

          {txnLoading ? (
            <LoadingState text="Loading transactions..." />
          ) : transactions.length === 0 ? (
            <div className="text-muted-foreground text-sm">No transactions found</div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="px-4 py-2 text-left">Date</th>
                    <th className="px-4 py-2 text-left">Type</th>
                    <th className="px-4 py-2 text-left">Reference</th>
                    <th className="px-4 py-2 text-left">Description</th>
                    <th className="px-4 py-2 text-right">Amount</th>
                    <th className="px-4 py-2 text-center">Status</th>
                    {canUpdate && <th className="px-4 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.id} className="border-t">
                      <td className="px-4 py-2">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                      <td className="px-4 py-2"><Badge variant={tx.type === "DEPOSIT" ? "default" : "secondary"}>{tx.type}</Badge></td>
                      <td className="px-4 py-2">{tx.reference || "-"}</td>
                      <td className="px-4 py-2">{tx.description || "-"}</td>
                      <td className="px-4 py-2 text-right">{currency} {tx.amount.toLocaleString()}</td>
                      <td className="px-4 py-2 text-center">
                        {tx.cleared ? (
                          <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50"><CheckCircle className="h-3 w-3 mr-1 inline" />Cleared</Badge>
                        ) : (
                          <Badge variant="outline" className="text-amber-600 border-amber-200 bg-amber-50"><Circle className="h-3 w-3 mr-1 inline" />Uncleared</Badge>
                        )}
                      </td>
                      {canUpdate && (
                        <td className="px-4 py-2 text-center">
                          <Button variant="ghost" size="sm" onClick={() => toggleCleared(tx.id, tx.cleared)}>
                            {tx.cleared ? "Unclear" : "Clear"}
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
