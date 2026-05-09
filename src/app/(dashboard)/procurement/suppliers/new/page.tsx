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

interface SupplierForm {
  code: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  taxNumber: string;
  paymentTerms: string;
}

const DEFAULT_FORM: SupplierForm = {
  code: "",
  name: "",
  contactPerson: "",
  email: "",
  phone: "",
  address: "",
  taxNumber: "",
  paymentTerms: "",
};

export default function NewSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState<SupplierForm>(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error("Supplier code and name are required");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/procurement/suppliers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: form.code.trim(),
          name: form.name.trim(),
          contactPerson: form.contactPerson || undefined,
          email: form.email || undefined,
          phone: form.phone || undefined,
          address: form.address || undefined,
          taxNumber: form.taxNumber || undefined,
          paymentTerms: form.paymentTerms || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create supplier"); return; }
      toast.success("Supplier created");
      router.push(`/procurement/suppliers/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Supplier"
        description="Create a supplier profile for procurement"
        actions={
          <Button variant="outline" asChild>
            <Link href="/procurement/suppliers"><ArrowLeft className="h-4 w-4 mr-2" />Back</Link>
          </Button>
        }
      />

      <Card className="max-w-2xl">
        <CardHeader><CardTitle className="text-base">Supplier Details</CardTitle></CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="code">Code <span className="text-destructive">*</span></Label>
                <Input id="code" name="code" value={form.code} onChange={handleChange} disabled={submitting} placeholder="e.g. SUP-001" />
              </div>
              <div className="space-y-1">
                <Label htmlFor="name">Name <span className="text-destructive">*</span></Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={submitting} placeholder="Supplier company name" />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="contactPerson">Contact Person</Label>
                <Input id="contactPerson" name="contactPerson" value={form.contactPerson} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={submitting} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" value={form.phone} onChange={handleChange} disabled={submitting} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taxNumber">Tax Number</Label>
                <Input id="taxNumber" name="taxNumber" value={form.taxNumber} onChange={handleChange} disabled={submitting} />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input id="paymentTerms" name="paymentTerms" value={form.paymentTerms} onChange={handleChange} disabled={submitting} placeholder="e.g. Net 30" />
            </div>

            <div className="space-y-1">
              <Label htmlFor="address">Address</Label>
              <textarea
                id="address"
                name="address"
                value={form.address}
                onChange={handleChange}
                rows={3}
                disabled={submitting}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button type="submit" disabled={submitting}>{submitting && <LoadingSpinner className="mr-2" />}Create Supplier</Button>
              <Button type="button" variant="outline" asChild><Link href="/procurement/suppliers">Cancel</Link></Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

