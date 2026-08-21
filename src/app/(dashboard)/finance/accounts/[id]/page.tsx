"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Power, PowerOff, BookOpen } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { usePermission } from "@/hooks/usePermission";
import { useCurrency } from "@/hooks/useCurrency";

export default function AccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "ledger">("overview");
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const canUpdate = usePermission("finance:account:update");
  const currency = useCurrency();

  async function fetchAccount() {
    try {
      const res = await fetch(`/api/finance/accounts/${id}`);
      const json = await res.json();
      if (res.ok) setAccount(json.data);
      else toast.error(json.message || "Account not found");
    } catch {
      toast.error("Failed to load account");
    } finally {
      setLoading(false);
    }
  }

  async function fetchLedger() {
    setLedgerLoading(true);
    try {
      const url = `/api/finance/accounts/${id}/ledger?page=1&pageSize=100&fromDate=${fromDate}&toDate=${toDate}`;
      const res = await fetch(url);
      const json = await res.json();
      if (res.ok) {
        setLedger(json.data);
      } else {
        toast.error(json.message || "Failed to load ledger");
      }
    } catch {
      toast.error("Failed to load ledger");
    } finally {
      setLedgerLoading(false);
    }
  }

  useEffect(() => {
    fetchAccount();
  }, [id]);

  useEffect(() => {
    if (activeTab === "ledger") {
      fetchLedger();
    }
  }, [activeTab]);

  async function toggleStatus() {
    if (!account) return;
    try {
      const res = await fetch(`/api/finance/accounts/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !account.isActive }),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success(json.data.isActive ? "Account activated" : "Account deactivated");
        fetchAccount();
      } else {
        toast.error(json.message || "Failed to update status");
      }
    } catch {
      toast.error("Failed to update status");
    }
  }

  if (loading) return <LoadingState text="Loading account..." />;
  if (!account) return <div className="text-muted-foreground">Account not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/finance/accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Accounts
      </Link>

      <div className="flex items-center justify-between">
        <PageHeader title={`${account.code} - ${account.name}`} description={account.description || "Chart of accounts entry"} />
        {canUpdate && (
          <Button variant="outline" onClick={toggleStatus}>
            {account.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
            {account.isActive ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>

      <div className="flex gap-2 border-b">
        <button onClick={() => setActiveTab("overview")} className={`px-4 py-2 text-sm font-medium ${activeTab === "overview" ? "border-b-2 border-primary" : "text-muted-foreground"}`}>Overview</button>
        <button onClick={() => setActiveTab("ledger")} className={`px-4 py-2 text-sm font-medium flex items-center gap-2 ${activeTab === "ledger" ? "border-b-2 border-primary" : "text-muted-foreground"}`}><BookOpen className="h-4 w-4" />Ledger</button>
      </div>

      {activeTab === "overview" && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Account Type</CardTitle></CardHeader><CardContent><Badge>{account.accountType}</Badge></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Opening Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currency} {(account.openingBalance ?? 0).toLocaleString()}</div></CardContent></Card>
            <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">{currency} {(account.currentBalance ?? 0).toLocaleString()}</div></CardContent></Card>
          </div>

          {account.children?.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Sub-accounts</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {account.children.map((child: any) => (
                    <Link key={child.id} href={`/finance/accounts/${child.id}`} className="block p-2 rounded hover:bg-muted">
                      {child.code} - {child.name} {child.isActive ? <Badge className="ml-2">Active</Badge> : <Badge variant="secondary" className="ml-2">Inactive</Badge>}
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeTab === "ledger" && (
        <div className="space-y-4">
          <div className="flex gap-4 items-end">
            <div className="space-y-2"><Label>From</Label><Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} /></div>
            <div className="space-y-2"><Label>To</Label><Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} /></div>
            <Button onClick={fetchLedger} disabled={ledgerLoading}>{ledgerLoading ? "Loading..." : "Filter"}</Button>
          </div>

          {ledgerLoading ? (
            <LoadingState text="Loading ledger..." />
          ) : ledger?.items?.length === 0 ? (
            <div className="text-muted-foreground text-sm">No transactions in this period</div>
          ) : (
            <div className="space-y-4">
              {ledger?.openingBalance !== undefined && (
                <div className="flex justify-between text-sm bg-muted p-3 rounded">
                  <span>Opening Balance: <strong>{currency} {ledger.openingBalance.toLocaleString()}</strong></span>
                  <span>Closing Balance: <strong>{currency} {ledger.closingBalance.toLocaleString()}</strong></span>
                </div>
              )}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-muted">
                    <tr>
                      <th className="px-4 py-2 text-left">Date</th>
                      <th className="px-4 py-2 text-left">Reference</th>
                      <th className="px-4 py-2 text-left">Voucher</th>
                      <th className="px-4 py-2 text-left">Description</th>
                      <th className="px-4 py-2 text-right">Debit</th>
                      <th className="px-4 py-2 text-right">Credit</th>
                      <th className="px-4 py-2 text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledger?.items?.map((row: any) => (
                      <tr key={row.id} className="border-t">
                        <td className="px-4 py-2">{new Date(row.date).toLocaleDateString()}</td>
                        <td className="px-4 py-2 font-medium">{row.reference}</td>
                        <td className="px-4 py-2"><Badge variant="outline">{row.voucherType}</Badge></td>
                        <td className="px-4 py-2">{row.description}</td>
                        <td className="px-4 py-2 text-right">{row.debit > 0 ? `${currency} ${row.debit.toLocaleString()}` : "-"}</td>
                        <td className="px-4 py-2 text-right">{row.credit > 0 ? `${currency} ${row.credit.toLocaleString()}` : "-"}</td>
                        <td className="px-4 py-2 text-right font-bold">{currency} {row.balance.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
