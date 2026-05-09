"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface NCR {
  id: string;
  reference: string;
  title: string;
  description: string;
  severity: string;
  status: string;
  disposition?: string | null;
  rootCause?: string | null;
  correctiveAction?: string | null;
  assignedToId?: string | null;
  resolvedAt?: string | null;
  closedAt?: string | null;
  createdAt: string;
  test?: { id: string; reference: string; testType: string } | null;
}

function severityBadge(severity: string) {
  const colors: Record<string, string> = {
    CRITICAL: "bg-red-100 text-red-700",
    MAJOR: "bg-orange-100 text-orange-700",
    MINOR: "bg-yellow-100 text-yellow-700",
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${colors[severity] ?? "bg-gray-100 text-gray-600"}`}>
      {severity}
    </span>
  );
}

const DISPOSITIONS = [
  { value: "ACCEPT", label: "Accept" },
  { value: "REJECT", label: "Reject" },
  { value: "REWORK", label: "Rework" },
  { value: "SCRAP", label: "Scrap" },
];

const SEVERITIES = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
];

export default function NcrDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [ncr, setNcr] = useState<NCR | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Resolve dialog
  const [showResolve, setShowResolve] = useState(false);
  const [resolveForm, setResolveForm] = useState({ disposition: "ACCEPT", rootCause: "", correctiveAction: "" });

  // Edit form
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", description: "", severity: "" });

  const load = useCallback(() => {
    setLoading(true);
    fetch(`/api/qc/ncr/${id}`)
      .then((r) => r.json())
      .then((d) => {
        setNcr(d.data);
        setEditForm({ title: d.data?.title ?? "", description: d.data?.description ?? "", severity: d.data?.severity ?? "" });
      })
      .catch(() => toast.error("Failed to load NCR"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { load(); }, [load]);

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qc/ncr/${id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resolveForm),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to resolve"); return; }
      toast.success("NCR resolved");
      setShowResolve(false);
      load();
    } catch { toast.error("Network error"); }
    finally { setActionLoading(false); }
  }

  async function handleClose() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qc/ncr/${id}/close`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to close"); return; }
      toast.success("NCR closed");
      load();
    } catch { toast.error("Network error"); }
    finally { setActionLoading(false); }
  }

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/qc/ncr/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update"); return; }
      toast.success("NCR updated");
      setEditing(false);
      load();
    } catch { toast.error("Network error"); }
    finally { setActionLoading(false); }
  }

  if (loading) return <LoadingState />;
  if (!ncr) return <div className="text-muted-foreground p-4">NCR not found.</div>;

  const canEdit = ncr.status === "OPEN" || ncr.status === "IN_REVIEW";

  return (
    <div>
      <PageHeader
        title={ncr.reference}
        description="Non-Conformance Report"
        actions={
          <Button variant="outline" asChild>
            <Link href="/qc/ncr"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      {/* Header cards */}
      <div className="grid gap-4 lg:grid-cols-3 mb-6">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">NCR Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div><p className="text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={ncr.status} /></div></div>
            <div><p className="text-muted-foreground">Severity</p><div className="mt-1">{severityBadge(ncr.severity)}</div></div>
            <div className="col-span-2"><p className="text-muted-foreground">Title</p><p className="mt-1 font-medium">{ncr.title}</p></div>
            <div className="col-span-2"><p className="text-muted-foreground">Description</p><p className="mt-1">{ncr.description}</p></div>
            {ncr.test && (
              <div><p className="text-muted-foreground">Linked Test</p>
                <Link href={`/qc/tests/${ncr.test.id}`} className="mt-1 hover:underline text-primary block">
                  {ncr.test.reference}
                </Link>
              </div>
            )}
            <div><p className="text-muted-foreground">Reported</p><p className="mt-1">{format(new Date(ncr.createdAt), "dd MMM yyyy")}</p></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Resolution</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div><p className="text-muted-foreground">Disposition</p><p className="mt-1 font-medium">{ncr.disposition ?? "—"}</p></div>
            {ncr.rootCause && <div><p className="text-muted-foreground">Root Cause</p><p className="mt-1">{ncr.rootCause}</p></div>}
            {ncr.correctiveAction && <div><p className="text-muted-foreground">Corrective Action</p><p className="mt-1">{ncr.correctiveAction}</p></div>}
            {ncr.resolvedAt && <div><p className="text-muted-foreground">Resolved</p><p className="mt-1">{format(new Date(ncr.resolvedAt), "dd MMM yyyy")}</p></div>}
            {ncr.closedAt && <div><p className="text-muted-foreground">Closed</p><p className="mt-1">{format(new Date(ncr.closedAt), "dd MMM yyyy")}</p></div>}
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <PermissionGuard require="qc:ncr:update">
        <div className="flex gap-2 mb-6">
          {canEdit && (
            <Button onClick={() => setShowResolve(true)} disabled={actionLoading}>Resolve NCR</Button>
          )}
          {ncr.status === "RESOLVED" && (
            <Button variant="outline" onClick={handleClose} disabled={actionLoading}>Close NCR</Button>
          )}
          {canEdit && (
            <Button variant="outline" onClick={() => setEditing(!editing)}>
              {editing ? "Cancel Edit" : "Edit"}
            </Button>
          )}
        </div>
      </PermissionGuard>

      {/* Resolve dialog */}
      {showResolve && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader><CardTitle>Resolve NCR</CardTitle></CardHeader>
            <CardContent>
              <form onSubmit={handleResolve} className="space-y-4">
                <div className="space-y-1">
                  <Label>Disposition <span className="text-destructive">*</span></Label>
                  <Select value={resolveForm.disposition} onValueChange={(v) => setResolveForm((p) => ({ ...p, disposition: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DISPOSITIONS.map((d) => <SelectItem key={d.value} value={d.value}>{d.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rootCause">Root Cause</Label>
                  <textarea id="rootCause" rows={3} value={resolveForm.rootCause}
                    onChange={(e) => setResolveForm((p) => ({ ...p, rootCause: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="correctiveAction">Corrective Action</Label>
                  <textarea id="correctiveAction" rows={3} value={resolveForm.correctiveAction}
                    onChange={(e) => setResolveForm((p) => ({ ...p, correctiveAction: e.target.value }))}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
                </div>
                <div className="flex gap-2 justify-end">
                  <Button type="button" variant="outline" onClick={() => setShowResolve(false)} disabled={actionLoading}>Cancel</Button>
                  <Button type="submit" disabled={actionLoading}>Resolve</Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Inline edit form */}
      {editing && (
        <Card className="mb-6">
          <CardHeader><CardTitle className="text-base">Edit NCR</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={handleSaveEdit} className="space-y-4 max-w-lg">
              <div className="space-y-1">
                <Label>Title <span className="text-destructive">*</span></Label>
                <Input value={editForm.title} onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))} required />
              </div>
              <div className="space-y-1">
                <Label>Severity</Label>
                <Select value={editForm.severity} onValueChange={(v) => setEditForm((p) => ({ ...p, severity: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Description <span className="text-destructive">*</span></Label>
                <textarea rows={4} value={editForm.description}
                  onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                  required
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" disabled={actionLoading}>Save Changes</Button>
                <Button type="button" variant="outline" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
