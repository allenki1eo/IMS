"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle, RotateCcw } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { PrintButton } from "@/components/shared/PrintButton";
import { LoadingState } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { usePermission } from "@/hooks/usePermission";
import { useCurrency } from "@/hooks/useCurrency";

export default function JournalEntryDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [entry, setEntry] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const canPost = usePermission("finance:journal:post");
  const canReverse = usePermission("finance:journal:reverse");
  const currency = useCurrency();

  async function fetchEntry() {
    try {
      const res = await fetch(`/api/finance/journal-entries/${id}`);
      const json = await res.json();
      if (res.ok) {
        setEntry(json.data);
      } else {
        toast.error(json.message || "Entry not found");
      }
    } catch {
      toast.error("Failed to load journal entry");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchEntry();
  }, [id]);

  async function postEntry() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/journal-entries/${id}/post`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Journal entry posted");
        fetchEntry();
      } else {
        toast.error(json.message || "Failed to post");
      }
    } catch {
      toast.error("Failed to post journal entry");
    } finally {
      setSubmitting(false);
    }
  }

  async function reverseEntry() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/finance/journal-entries/${id}/reverse`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        toast.success("Journal entry reversed");
        fetchEntry();
      } else {
        toast.error(json.message || "Failed to reverse");
      }
    } catch {
      toast.error("Failed to reverse journal entry");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState text="Loading journal entry..." />;
  if (!entry) return <div className="text-muted-foreground">Journal entry not found</div>;

  return (
    <div className="space-y-6">
      <Link href="/finance/journal-entries" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="mr-1 h-4 w-4" />
        Back to Journal Entries
      </Link>

      <div className="flex items-center justify-between">
        <PageHeader title={entry.reference} description={entry.description} />
        <div className="flex gap-2">
          <PrintButton className="no-print" />
          {entry.status === "DRAFT" && canPost && (
            <Button onClick={postEntry} disabled={submitting}>
              <CheckCircle className="mr-2 h-4 w-4" />
              Post
            </Button>
          )}
          {entry.status === "POSTED" && canReverse && (
            <Button variant="destructive" onClick={reverseEntry} disabled={submitting}>
              <RotateCcw className="mr-2 h-4 w-4" />
              Reverse
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Date</CardTitle></CardHeader><CardContent>{new Date(entry.entryDate).toLocaleDateString()}</CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Voucher</CardTitle></CardHeader><CardContent><Badge variant="outline">{entry.voucherType || "JOURNAL"}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Status</CardTitle></CardHeader><CardContent><Badge variant={entry.status === "POSTED" ? "default" : entry.status === "REVERSED" ? "destructive" : "secondary"}>{entry.status}</Badge></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Debit</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{currency} {entry.totalDebit.toLocaleString()}</div></CardContent></Card>
        <Card><CardHeader className="pb-2"><CardTitle className="text-sm font-medium">Total Credit</CardTitle></CardHeader><CardContent><div className="text-xl font-bold">{currency} {entry.totalCredit.toLocaleString()}</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Journal Lines</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead className="bg-muted">
              <tr><th className="px-4 py-2 text-left">Account</th><th className="px-4 py-2 text-left">Description</th><th className="px-4 py-2 text-right">Debit</th><th className="px-4 py-2 text-right">Credit</th></tr>
            </thead>
            <tbody>
              {entry.lines.map((line: any) => (
                <tr key={line.id} className="border-t">
                  <td className="px-4 py-2">{line.account.code} - {line.account.name}</td>
                  <td className="px-4 py-2">{line.description}</td>
                  <td className="px-4 py-2 text-right">{line.debit > 0 ? `${currency} ${line.debit.toLocaleString()}` : "-"}</td>
                  <td className="px-4 py-2 text-right">{line.credit > 0 ? `${currency} ${line.credit.toLocaleString()}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
