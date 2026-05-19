"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
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
  dateFormat: string;
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
  currency: "TZS",
  dateFormat: "DD/MM/YYYY",
};

const CURRENCIES = ["TZS", "USD", "EUR", "KES", "GBP", "ZAR", "AUD", "CAD", "JPY", "CNY", "INR"];
const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"];

export default function CompanyPage() {
  const [form, setForm] = useState<CompanyForm>(DEFAULT);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/company")
      .then((r) => r.json())
      .then((d) => {
        if (d.data) {
          setForm((prev) => ({ ...prev, ...d.data }));
        }
      })
      .catch(() => toast.error("Failed to load company data"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleSelect(name: keyof CompanyForm, value: string) {
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name) { toast.error("Company name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/company", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save company info"); return; }
      toast.success("Company profile saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Company Profile"
        description="Manage your organisation's details"
      />

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
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Currency</Label>
                <Select value={form.currency} onValueChange={(v) => handleSelect("currency", v)} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CURRENCIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Date Format</Label>
                <Select value={form.dateFormat} onValueChange={(v) => handleSelect("dateFormat", v)} disabled={saving}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DATE_FORMATS.map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <PermissionGuard require="company:company:update">
          <Button type="submit" disabled={saving}>
            {saving && <LoadingSpinner className="mr-2" />}
            Save Changes
          </Button>
        </PermissionGuard>
      </form>
    </div>
  );
}
