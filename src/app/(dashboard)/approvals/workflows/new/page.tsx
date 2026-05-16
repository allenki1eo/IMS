"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
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
  stepNumber: number;
  name: string;
  approverType: string;
  approverRoleId: string;
}

interface RoleOption { id: string; name: string; }

const APPROVER_TYPES = [
  { value: "ROLE", label: "Role" },
  { value: "SPECIFIC_USER", label: "Specific User" },
  { value: "MANAGER", label: "Direct Manager" },
];

function emptyStep(stepNumber: number): WorkflowStep {
  return { stepNumber, name: "", approverType: "ROLE", approverRoleId: "" };
}

export default function NewWorkflowPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", module: "", resource: "", description: "" });
  const [steps, setSteps] = useState<WorkflowStep[]>([emptyStep(1)]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch("/api/roles?pageSize=200")
      .then((r) => r.json())
      .then((d) => setRoles(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleStepChange(idx: number, field: keyof WorkflowStep, value: string) {
    setSteps((prev) =>
      prev.map((s, i) => (i === idx ? { ...s, [field]: value === "__none" ? "" : value } : s))
    );
  }

  function addStep() {
    setSteps((prev) => [...prev, emptyStep(prev.length + 1)]);
  }

  function removeStep(idx: number) {
    setSteps((prev) => prev.filter((_, i) => i !== idx).map((s, i) => ({ ...s, stepNumber: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.module || !form.resource) {
      toast.error("Name, module and resource are required");
      return;
    }
    if (steps.some((s) => !s.name)) {
      toast.error("All steps must have a name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/approval-workflows", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          module: form.module,
          resource: form.resource,
          description: form.description || undefined,
          steps: steps.map((s) => ({
            stepNumber: s.stepNumber,
            name: s.name,
            approverType: s.approverType,
            approverRoleId: s.approverRoleId || undefined,
          })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create workflow"); return; }
      toast.success("Workflow created");
      router.push("/approvals/workflows");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Create Workflow"
        description="Define a new approval workflow"
        actions={
          <Button variant="outline" asChild>
            <Link href="/approvals/workflows">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Workflow Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input id="name" name="name" value={form.name} onChange={handleFormChange} disabled={submitting} placeholder="e.g. Purchase Order Approval" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="module">
                  Module <span className="text-destructive">*</span>
                </Label>
                <Input id="module" name="module" value={form.module} onChange={handleFormChange} disabled={submitting} placeholder="e.g. procurement" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="resource">
                  Resource <span className="text-destructive">*</span>
                </Label>
                <Input id="resource" name="resource" value={form.resource} onChange={handleFormChange} disabled={submitting} placeholder="e.g. purchase_order" />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description} onChange={handleFormChange} disabled={submitting} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Approval Steps</CardTitle>
            <Button type="button" variant="outline" size="sm" onClick={addStep} disabled={submitting}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {steps.map((step, idx) => (
              <div key={idx} className="border rounded-md p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-muted-foreground">Step {step.stepNumber}</span>
                  {steps.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => removeStep(idx)} disabled={submitting}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <div className="space-y-1">
                  <Label>Step Name <span className="text-destructive">*</span></Label>
                  <Input
                    value={step.name}
                    onChange={(e) => handleStepChange(idx, "name", e.target.value)}
                    placeholder="e.g. Manager Approval"
                    disabled={submitting}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label>Approver Type</Label>
                    <Select value={step.approverType} onValueChange={(v) => handleStepChange(idx, "approverType", v)} disabled={submitting}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {APPROVER_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  {step.approverType === "ROLE" && (
                    <div className="space-y-1">
                      <Label>Approver Role</Label>
                      <Select value={step.approverRoleId || "__none"} onValueChange={(v) => handleStepChange(idx, "approverRoleId", v)} disabled={submitting}>
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
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button type="submit" disabled={submitting}>
            {submitting && <LoadingSpinner className="mr-2" />}
            Create Workflow
          </Button>
          <Button variant="outline" type="button" asChild>
            <Link href="/approvals/workflows">Cancel</Link>
          </Button>
        </div>
      </form>
    </div>
  );
}
