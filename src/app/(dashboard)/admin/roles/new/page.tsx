"use client";

import { useState } from "react";
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

interface FormData {
  name: string;
  code: string;
  description: string;
}

const DEFAULT_FORM: FormData = { name: "", code: "", description: "" };

export default function NewRolePage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase().replace(/\s+/g, "_") : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name || !form.code) {
      toast.error("Name and code are required");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          description: form.description || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create role");
        return;
      }
      toast.success("Role created successfully");
      router.push(`/admin/roles/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Role"
        description="Create a new system role"
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/roles">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Role Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Warehouse Manager"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="code">
                Code <span className="text-destructive">*</span>
              </Label>
              <Input
                id="code"
                name="code"
                value={form.code}
                onChange={handleChange}
                placeholder="e.g. WAREHOUSE_MANAGER"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">Uppercase letters and underscores only.</p>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Optional description"
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Role
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/roles">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
