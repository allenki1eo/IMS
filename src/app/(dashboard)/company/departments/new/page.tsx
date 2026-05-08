"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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

interface FormData {
  name: string;
  code: string;
  branchId: string;
  parentId: string;
  description: string;
}

interface Branch { id: string; name: string; }
interface Department { id: string; name: string; }

const DEFAULT: FormData = { name: "", code: "", branchId: "", parentId: "", description: "" };

export default function NewDepartmentPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);

  useEffect(() => {
    fetch("/api/branches?pageSize=200")
      .then((r) => r.json())
      .then((d) => setBranches(d.data ?? []))
      .catch(() => {});
    fetch("/api/departments?pageSize=200")
      .then((r) => r.json())
      .then((d) => setDepartments(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase().replace(/\s+/g, "_") : value,
    }));
  }

  function handleSelect(name: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [name]: value === "__none" ? "" : value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code) { toast.error("Name and code are required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/departments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          branchId: form.branchId || undefined,
          parentId: form.parentId || undefined,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create department"); return; }
      toast.success("Department created");
      router.push("/company/departments");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Department"
        description="Create a new department"
        actions={
          <Button variant="outline" asChild>
            <Link href="/company/departments">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Department Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="name">
                  Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input id="code" name="code" value={form.code} onChange={handleChange} placeholder="e.g. HR" disabled={submitting} />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Branch</Label>
              <Select value={form.branchId} onValueChange={(v) => handleSelect("branchId", v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select branch (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {branches.map((b) => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Parent Department</Label>
              <Select value={form.parentId} onValueChange={(v) => handleSelect("parentId", v)} disabled={submitting}>
                <SelectTrigger>
                  <SelectValue placeholder="Select parent (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">None</SelectItem>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input id="description" name="description" value={form.description} onChange={handleChange} disabled={submitting} />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Department
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/company/departments">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
