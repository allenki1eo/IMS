"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WorkflowStep {
  id?: string;
  stepNumber: number;
  name: string;
  approverType: string;
  approverRoleId: string;
}

interface Workflow {
  id: string;
  name: string;
  module: string;
  resource: string;
  description: string | null;
  status: string;
  steps: WorkflowStep[];
}

interface RoleOption { id: string; name: string; }

const APPROVER_TYPES = [
  { value: "ROLE", label: "Role" },
  { value: "SPECIFIC_USER", label: "Specific User" },
  { value: "MANAGER", label: "Direct Manager" },
];

export default function WorkflowDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [workflow, setWorkflow] = useState<Workflow | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<RoleOption[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [steps, setSteps] = useState<WorkflowStep[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/approval-workflows/${id}`).then((r) => r.json()),
      fetch("/api/roles?pageSize=200").then((r) => r.json()),
    ])
      .then(([wfJson, rolesJson]) => {
        const w = wfJson.data;
        setWorkflow(w);
        if (w) {
          setName(w.name);
          setDescription(w.description ?? "");
          setSteps(w.steps ?? []);
        }
        setRoles(rolesJson.data ?? []);
      })
      .catch(() => toast.error("Failed to load workflow"))
      .finally(() => setLoading(false));
  }, [id]);

  function handleStepChange(idx: number, field: keyof WorkflowStep, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value === "__none" ? "" : value } : s))
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, { stepNumber: prev.length + 1, name: "", approverType: "ROLE", approverRoleId: "" }]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) { toast.error("Name is required"); return; }
    if (steps.some((s) => !s.name)) { toast.error("All steps must have a name"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/approval-workflows/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description: description || undefined,
          steps: steps.map((s) => ({
            id: s.id,
            stepNumber: s.stepNumber,
            name: s.name,
            approverType: s.approverType,
            approverRoleId: s.approverRoleId || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update workflow"); return; }
      toast.success("Workflow updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;
  if (!workflow) return <div className="text-muted-foreground">Workflow not found.</div>;

  return (
    <div>
      <PageHeader
        title={workflow.name}
        description={`${workflow.module} / ${workflow.resource}`}
        actions={
          <Button variant="outline" asChild>
            <Link href="/approvals/workflows">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <div className="flex items-center gap-2 mb-6">
        <StatusBadge status={workflow.status} />
        <span className="text-sm text-muted-foreground capitalize">
          {workflow.module.replace(/_/g, " ")} &rsaquo; {workflow.resource.replace(/_/g, " ")}
        </span>
      </div>

      <PermissionGuard require="approvals:workflow:update">
        <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Workflow Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={saving} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Module</Label>
                  <Input value={workflow.module} disabled readOnly className="bg-muted" />
                </div>
                <div className="space-y-1">
                  <Label>Resource</Label>
                  <Input value={workflow.resource} disabled readOnly className="bg-muted" />
                </div>
              </div>
              <div className="space-y-1">
                <Label htmlFor="description">Description</Label>
                <Input id="description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Approval Steps</CardTitle>
              <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={saving}>
                <Plus className="h-4 w-4 mr-1" />
                Add Step
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {steps.length === 0 ? (
                <p className="text-sm text-muted-foreground">No steps defined.</p>
              ) : (
                steps.map((step, idx) => (
                  <div key={idx} className="border rounded-md p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-muted-foreground">Step {step.stepNumber}</span>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)} disabled={saving}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <div className="space-y-1">
                      <Label>Step Name <span className="text-destructive">*</span></Label>
                      <Input
                        value={step.name}
                        onChange={(e) => handleStepChange(idx, "name", e.target.value)}
                        disabled={saving}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label>Approver Type</Label>
                        <Select value={step.approverType} onValueChange={(v) => handleStepChange(idx, "approverType", v)} disabled={saving}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {APPROVER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      {step.approverType === "ROLE" && (
                        <div className="space-y-1">
                          <Label>Approver Role</Label>
                          <Select value={step.approverRoleId || "__none"} onValueChange={(v) => handleStepChange(idx, "approverRoleId", v)} disabled={saving}>
                            <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value="__none">None</SelectItem>
                              {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="flex gap-2">
            <Button type="submit" disabled={saving}>
              {saving && <LoadingSpinner className="mr-2" />}
              Save Changes
            </Button>
            <Button variant="outline" type="button" asChild>
              <Link href="/approvals/workflows">Cancel</Link>
            </Button>
          </div>
        </form>
      </PermissionGuard>
    </div>
  );
}
