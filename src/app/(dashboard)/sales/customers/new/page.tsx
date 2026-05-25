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
  email: string;
  phone: string;
  address: string;
  contactPerson: string;
  creditLimit: string;
  currency: string;
  notes: string;
}

export default function NewCustomerPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "",
    code: "",
    email: "",
    phone: "",
    address: "",
    contactPerson: "",
    creditLimit: "",
    currency: "TZS",
    notes: "",
  });

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      // Auto-generate code from name if code is empty
      if (name === "name" && !prev.code) {
        updated.code = value.toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "").slice(0, 20);
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.code.trim()) { toast.error("Code is required"); return; }

    setSubmitting(true);
    try {
      const res = await fetch("/api/sales/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          code: form.code.trim(),
          email: form.email.trim() || undefined,
          phone: form.phone.trim() || undefined,
          address: form.address.trim() || undefined,
          contactPerson: form.contactPerson.trim() || undefined,
          creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
          currency: form.currency,
          notes: form.notes.trim() || undefined,
          status: "ACTIVE",
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to create customer"); return; }
      toast.success("Customer created");
      router.push(`/sales/customers/${json.data.id}`);
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="New Customer"
        description="Create a new customer record"
        actions={
          <Button variant="outline" asChild>
            <Link href="/sales/customers">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Link>
          </Button>
        }
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader><CardTitle className="text-sm">Customer Details</CardTitle></CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input name="name" value={form.name} onChange={handleChange} placeholder="Customer name" />
            </div>
            <div className="space-y-1">
              <Label>Code *</Label>
              <Input name="code" value={form.code} onChange={handleChange} placeholder="CUSTOMER_CODE" />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="email@example.com" />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input name="phone" value={form.phone} onChange={handleChange} placeholder="+255..." />
            </div>
            <div className="space-y-1">
              <Label>Contact Person</Label>
              <Input name="contactPerson" value={form.contactPerson} onChange={handleChange} placeholder="Contact person name" />
            </div>
            <div className="space-y-1">
              <Label>Credit Limit</Label>
              <Input type="number" min="0" step="any" name="creditLimit" value={form.creditLimit} onChange={handleChange} placeholder="0" />
            </div>
            <div className="space-y-1">
              <Label>Currency</Label>
              <Select value={form.currency} onValueChange={(v) => setForm((p) => ({ ...p, currency: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="TZS">TZS</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="KES">KES</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Address</Label>
              <Input name="address" value={form.address} onChange={handleChange} placeholder="Physical address" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Notes</Label>
              <Input name="notes" value={form.notes} onChange={handleChange} placeholder="Optional notes..." />
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/sales/customers">Cancel</Link>
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? <LoadingSpinner className="mr-2" /> : null}
            Create Customer
          </Button>
        </div>
      </form>
    </div>
  );
}
