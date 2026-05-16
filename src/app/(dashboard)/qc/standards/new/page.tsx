"use client";

import { useState, useEffect } from "react";
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

interface ItemOption {
  id: string;
  name: string;
  code?: string;
}

interface FormData {
  code: string;
  name: string;
  itemId: string;
  description: string;
}

const DEFAULT: FormData = {
  code: "",
  name: "",
  itemId: "",
  description: "",
};

export default function NewQcStandardPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [items, setItems] = useState<ItemOption[]>([]);

  useEffect(() => {
    fetch("/api/items?pageSize=200")
      .then((r) => r.json())
      .then((d) => setItems(d.data ?? []))
      .catch(() => {});
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Code and name are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/qc/standards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          itemId: form.itemId || undefined,
          description: form.description.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create standard"); return; }
      toast.success("Quality standard created");
      router.push(`/qc/standards/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Quality Standard"
        description="Create a quality standard with test parameters"
        actions={
          <Button variant="outline" asChild>
            <Link href="/qc/standards">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Standard Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Input
                  id="code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. QS-001"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input
                  id="name"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="e.g. Raw Material Inspection"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label>Linked Item (optional)</Label>
              <Select
                value={form.itemId || "__none"}
                onValueChange={(v) => setForm((p) => ({ ...p, itemId: v === "__none" ? "" : v }))}
                disabled={submitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select item" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none">No linked item</SelectItem>
                  {items.map((item) => (
                    <SelectItem key={item.id} value={item.id}>
                      {item.code ? `${item.code} — ` : ""}{item.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="description">Description (optional)</Label>
              <textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                placeholder="Describe the purpose and scope of this standard..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Standard
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/qc/standards">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
