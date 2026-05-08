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
import { useLocalDraft } from "@/hooks/useLocalDraft";

interface FormData {
  fullName: string;
  username: string;
  email: string;
  phone: string;
  password: string;
}

const DEFAULT_FORM: FormData = {
  fullName: "",
  username: "",
  email: "",
  phone: "",
  password: "",
};

export default function NewUserPage() {
  const router = useRouter();
  const { draft, saveDraft, clearDraft } = useLocalDraft<FormData>("new-user", DEFAULT_FORM);
  const [form, setForm] = useState<FormData>(draft);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setForm(draft);
  }, [draft]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const updated = { ...form, [e.target.name]: e.target.value };
    setForm(updated);
    saveDraft(updated);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.fullName || !form.username || !form.email || !form.password) {
      toast.error("Please fill in all required fields");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          username: form.username,
          email: form.email,
          phone: form.phone || undefined,
          password: form.password,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create user");
        return;
      }
      clearDraft();
      toast.success("User created successfully");
      router.push("/admin/users");
    } catch {
      toast.error("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add User"
        description="Create a new system user account"
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/users">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-lg">
        <CardHeader>
          <CardTitle className="text-base">User Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="fullName">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="fullName"
                name="fullName"
                value={form.fullName}
                onChange={handleChange}
                placeholder="Jane Doe"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="username">
                Username <span className="text-destructive">*</span>
              </Label>
              <Input
                id="username"
                name="username"
                value={form.username}
                onChange={handleChange}
                placeholder="janedoe"
                autoComplete="off"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="email">
                Email <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="jane@example.com"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="+1 555 000 0000"
                disabled={submitting}
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="password">
                Password <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="Min. 8 characters"
                autoComplete="new-password"
                disabled={submitting}
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create User
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/admin/users">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
