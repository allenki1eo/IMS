"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingSpinner } from "@/components/shared/LoadingState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const CURRENCIES = ["USD", "ZAR", "EUR", "GBP", "AUD", "CAD", "JPY", "CNY", "INR"];

interface CompanyForm {
  name: string;
  legalName: string;
  registrationNumber: string;
  taxNumber: string;
  address: string;
  city: string;
  country: string;
  phone: string;
  email: string;
  website: string;
  currency: string;
}

const DEFAULT: CompanyForm = {
  name: "",
  legalName: "",
  registrationNumber: "",
  taxNumber: "",
  address: "",
  city: "",
  country: "",
  phone: "",
  email: "",
  website: "",
  currency: "USD",
};

export default function NewCompanyPage() {
  const router = useRouter();
  const [form, setForm] = useState<CompanyForm>(DEFAULT);
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (res.ok) {
        toast.success("Company created successfully");
        router.push("/companies");
      } else {
        toast.error(json.error ?? "Failed to create company");
      }
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader title="New Company" description="Create a new organisation" />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="name">
                  Company Name <span className="text-destructive">*</span>
                </Label>
                <Input id="name" name="name" value={form.name} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1 col-span-2 sm:col-span-1">
                <Label htmlFor="legalName">Legal Name</Label>
                <Input id="legalName" name="legalName" value={form.legalName} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="registrationNumber">Registration Number</Label>
                <Input id="registrationNumber" name="registrationNumber" value={form.registrationNumber} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="taxNumber">Tax Number</Label>
                <Input id="taxNumber" name="taxNumber" value={form.taxNumber} onChange={handleChange} disabled={saving} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Contact & Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="address">Street Address</Label>
              <Input id="address" name="address" value={form.address} onChange={handleChange} disabled={saving} />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" value={form.city} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="country">Country</Label>
                <Input id="country" name="country" value={form.country} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" value={form.phone} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" value={form.email} onChange={handleChange} disabled={saving} />
              </div>
              <div className="space-y-1 col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" value={form.website} onChange={handleChange} placeholder="https://example.com" disabled={saving} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Regional Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-1 max-w-xs">
              <Label htmlFor="currency">Currency</Label>
              <select
                id="currency"
                name="currency"
                value={form.currency}
                onChange={handleChange}
                disabled={saving}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button type="submit" disabled={saving}>
            {saving && <LoadingSpinner className="mr-2" />}
            Create Company
          </Button>
          <Button type="button" variant="outline" onClick={() => router.push("/companies")} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
}
