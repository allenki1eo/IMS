"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { SearchInput } from "@/components/shared/SearchInput";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDebounceSearch } from "@/hooks/useDebounceSearch";

interface Buyer {
  id: string;
  name: string;
  contactName?: string | null;
  email?: string | null;
  phone?: string | null;
  country?: string | null;
  isActive: boolean;
  _count: { contracts: number };
}

export default function BuyersPage() {
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const { value: search, setValue: setSearch, debounced } = useDebounceSearch();
  const [form, setForm] = useState({
    name: "", contactName: "", email: "", phone: "", address: "", country: "", taxNumber: "",
  });

  function loadBuyers() {
    setLoading(true);
    const params = new URLSearchParams();
    if (debounced) params.set("search", debounced);
    fetch(`/api/cotton/buyers?${params}`)
      .then((r) => r.json())
      .then((d) => { if (d.success) setBuyers(d.data); })
      .catch(() => toast.error("Failed to load buyers"))
      .finally(() => setLoading(false));
  }

  useEffect(loadBuyers, [debounced]);

  async function handleCreate() {
    if (!form.name) { toast.error("Name is required"); return; }
    setSaving(true);
    try {
      const res = await fetch("/api/cotton/buyers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Buyer created");
        setAddOpen(false);
        setForm({ name: "", contactName: "", email: "", phone: "", address: "", country: "", taxNumber: "" });
        loadBuyers();
      } else {
        toast.error(d.error ?? "Failed to create buyer");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cotton Buyers"
        description="Manage cotton buyers"
        actions={
          <PermissionGuard require="cotton:buyer:create">
            <Button onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Buyer
            </Button>
          </PermissionGuard>
        }
      />

      <div className="mb-4">
        <SearchInput value={search} onChange={setSearch} placeholder="Search buyers..." className="w-full sm:max-w-xs" />
      </div>

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : buyers.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">No buyers found.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {buyers.map((buyer) => (
            <Card key={buyer.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">
                    <Link href={`/cotton/buyers/${buyer.id}`} className="hover:underline">
                      {buyer.name}
                    </Link>
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {buyer.contactName && <p className="text-muted-foreground">{buyer.contactName}</p>}
                {buyer.email && <p className="text-muted-foreground">{buyer.email}</p>}
                {buyer.country && <p className="text-muted-foreground">{buyer.country}</p>}
                <p className="pt-1 font-medium">{buyer._count.contracts} contract{buyer._count.contracts !== 1 ? "s" : ""}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New Buyer</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label>Name *</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Buyer company name" />
            </div>
            <div>
              <Label>Contact Person</Label>
              <Input value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })} placeholder="Contact name" />
            </div>
            <div>
              <Label>Email</Label>
              <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <div>
              <Label>Phone</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </div>
            <div>
              <Label>Country</Label>
              <Input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
            </div>
            <div>
              <Label>Tax Number</Label>
              <Input value={form.taxNumber} onChange={(e) => setForm({ ...form, taxNumber: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>{saving ? "Saving..." : "Create Buyer"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
