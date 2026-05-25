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
  code: string;
  name: string;
  uom: string;
  unitPrice: string;
  description: string;
}

export default function NewFgProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormData>({
    code: "",
    name: "",
    uom: "UNIT",
    unitPrice: "",
    description: "",
  });
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim()) {
      toast.error("Product code is required");
      return;
    }
    if (!form.name.trim()) {
      toast.error("Product name is required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/dispatch/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          uom: form.uom.trim() || "UNIT",
          unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
          description: form.description.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create product"); return; }
      toast.success("Product created");
      router.push(`/dispatch/products/${json.data?.id ?? ""}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New FG Product"
        description="Create a finished goods product"
        actions={
          <Button variant="outline" asChild>
            <Link href="/dispatch/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Product Details</CardTitle>
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
                  placeholder="e.g. FG-001"
                  disabled={submitting}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uom">Unit of Measure</Label>
                <Input
                  id="uom"
                  name="uom"
                  value={form.uom}
                  onChange={handleChange}
                  placeholder="e.g. UNIT, CASE, L"
                  disabled={submitting}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
              <Input
                id="name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Premium Lager 500ml"
                disabled={submitting}
                required
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="unitPrice">Unit Price (optional)</Label>
              <Input
                id="unitPrice"
                name="unitPrice"
                type="number"
                min="0"
                step="any"
                value={form.unitPrice}
                onChange={handleChange}
                placeholder="e.g. 2.50"
                disabled={submitting}
              />
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
                placeholder="Any additional product description..."
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                Create Product
              </Button>
              <Button variant="outline" type="button" asChild>
                <Link href="/dispatch/products">Cancel</Link>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
