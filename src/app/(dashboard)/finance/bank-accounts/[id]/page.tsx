"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";

export default function BankAccountDetailPage() {
  const { id } = useParams();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canUpdate = usePermission("finance:bank:update");

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

  useEffect(() => {
    fetchAccount();
  }, [id]);

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

  if (loading) return <LoadingState message="Loading bank account..." />;
  if (!account) return <div className="text-muted-foreground">Bank account not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/finance/bank-accounts" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Bank Accounts
      </Link>

      <div className="flex items-center justify-between">
        <PageHeader title={account.name} description={account.bankName || "Bank / Cash account"} />
        {canUpdate && (
          <Button variant="outline" onClick={toggleStatus}>
            {account.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
            {account.isActive ? "Deactivate" : "Activate"}
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Type</CardTitle></CardHeader><CardContent><Badge>{account.accountType}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Account Number</CardTitle></CardHeader><CardContent>{account.accountNumber || "-"}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Currency</CardTitle></CardHeader><CardContent>{account.currency}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Balance</CardTitle></CardHeader><CardContent><div className="text-2xl font-bold">${account.currentBalance.toLocaleString()}</div></CardContent></Card>
      </div>

      {account.transactions?.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Recent Transactions</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="bg-muted"><tr><th className="px-4 py-2 text-left">Date</th><th className="px-4 py-2 text-left">Type</th><th className="px-4 py-2 text-left">Reference</th><th className="px-4 py-2 text-right">Amount</th></tr></thead>
              <tbody>
                {account.transactions.map((tx: any) => (
                  <tr key={tx.id} className="border-t">
                    <td className="px-4 py-2">{new Date(tx.transactionDate).toLocaleDateString()}</td>
                    <td className="px-4 py-2"><Badge variant={tx.type === "DEPOSIT" ? "default" : "secondary"}>{tx.type}</Badge></td>
                    <td className="px-4 py-2">{tx.reference || "-"}</td>
                    <td className="px-4 py-2 text-right">${tx.amount.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
