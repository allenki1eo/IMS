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
  city: string;
  address: string;
  phone: string;
  email: string;
}

const DEFAULT: FormData = { name: "", code: "", city: "", address: "", phone: "", email: "" };

export default function NewBranchPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
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
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          city: form.city || undefined,
          address: form.address || undefined,
          phone: form.phone || undefined,
          email: form.email || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create branch"); return; }
      toast.success("Branch created");
      router.push("/company/branches");
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add Branch"
        description="Create a new company branch"
        actions={
          <Button variant="outline" asChild>
            <Link href="/company/branches">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">Branch Details</CardTitle>
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
                <Input id="code" name="code" value={form.code} onChange={handleChange} placeholder="e.g. HQ" disabled={submitting} />
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} disabled={submitting} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" value={form.city} onChange={handleChange} disabled={submitting} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} />
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Branch
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/company/branches">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
