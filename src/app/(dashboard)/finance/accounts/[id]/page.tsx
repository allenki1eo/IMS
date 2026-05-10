"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Pencil, Power, PowerOff } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";

export default function AccountDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [account, setAccount] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const canUpdate = usePermission("finance:account:update");

  async function fetchAccount() {
    try {
      const res = await fetch(`/api/finance/accounts/${id}`);
      const json = await res.json();
      if (res.ok) {
        setAccount(json.data);
      } else {
        toast.error(json.message || "Account not found");
      }
    } catch {
      toast.error("Failed to load account");
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

  if (loading) return <LoadingState message="Loading account..." />;
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
          <div className="flex gap-2">
            <Button variant="outline" onClick={toggleStatus}>
              {account.isActive ? <PowerOff className="mr-2 h-4 w-4" /> : <Power className="mr-2 h-4 w-4" />}
              {account.isActive ? "Deactivate" : "Activate"}
            </Button>
          </div>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Account Type</CardTitle></CardHeader>
          <CardContent><Badge>{account.accountType}</Badge></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Opening Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${account.openingBalance.toLocaleString()}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Current Balance</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">${account.currentBalance.toLocaleString()}</div></CardContent>
        </Card>
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
  );
}
