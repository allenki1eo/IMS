"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
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

interface TestOption {
  id: string;
  reference: string;
  testType: string;
}

interface EmployeeOption {
  id: string;
  firstName: string;
  lastName: string;
}

const SEVERITY_OPTIONS = [
  { value: "MINOR", label: "Minor" },
  { value: "MAJOR", label: "Major" },
  { value: "CRITICAL", label: "Critical" },
];

interface FormData {
  title: string;
  description: string;
  severity: string;
  testId: string;
  assignedToId: string;
}

export default function NewNcrPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillTestId = searchParams.get("testId") ?? "";

  const [form, setForm] = useState<FormData>({
    title: "",
    description: "",
    severity: "MINOR",
    testId: prefillTestId,
    assignedToId: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [tests, setTests] = useState<TestOption[]>([]);
  const [employees, setEmployees] = useState<EmployeeOption[]>([]);

  useEffect(() => {
    Promise.all([
      fetch("/api/qc/tests?status=COMPLETED&pageSize=200").then((r) => r.json()),
      fetch("/api/employees?pageSize=200").then((r) => r.json()),
    ])
      .then(([testsData, empData]) => {
        setTests(testsData.data ?? []);
        setEmployees(empData.data ?? []);
      })
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!form.description.trim()) {
      toast.error("Description is required");
      return;
    }
    if (!form.severity) {
      toast.error("Severity is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/qc/ncr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title.trim(),
          description: form.description.trim(),
          severity: form.severity,
          testId: form.testId || undefined,
          assignedToId: form.assignedToId || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create NCR"); return; }
      toast.success("NCR created successfully");
      router.push(`/qc/ncr/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Non-Conformance Report"
        description="Report a non-conformance for investigation and resolution"
        actions={
          <Button variant="outline" asChild>
            <Link href="/qc/ncr">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">NCR Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="title">Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="Brief description of the non-conformance"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description <span className="text-destructive">*</span></Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={4}
                disabled={submitting}
                placeholder="Detailed description of the non-conformance..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="space-y-1">
              <Label>Severity <span className="text-destructive">*</span></Label>
              <Select
                value={form.severity}
                onValueChange={(v) => setForm((p) => ({ ...p, severity: v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Linked Test (optional)</Label>
              <Select
                value={form.testId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, testId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select test" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No linked test</SelectItem>
                  {tests.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.reference} ({t.testType.replace(/_/g, " ")})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Assigned To (optional)</Label>
              <Select
                value={form.assignedToId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, assignedToId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select employee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">Unassigned</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={emp.id}>
                      {emp.firstName} {emp.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create NCR
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/qc/ncr">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
