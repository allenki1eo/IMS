"use client";

import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { LoadingState, LoadingSpinner } from "@/components/shared/LoadingState";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface UOM {
  id: string;
  name: string;
  code: string;
  symbol: string;
}

const DEFAULT_FORM = { name: "", code: "", symbol: "" };

export default function UOMPage() {
  const [uoms, setUoms] = useState<UOM[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editing, setEditing] = useState<UOM | null>(null);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [submitting, setSubmitting] = useState(false);

  const fetchUOMs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/uoms?pageSize=200");
      const json = await res.json();
      setUoms(json.data ?? []);
    } catch {
      toast.error("Failed to load units of measure");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUOMs(); }, [fetchUOMs]);

  function openCreate() {
    setEditing(null);
    setForm(DEFAULT_FORM);
    setShowDialog(true);
  }

  function openEdit(uom: UOM) {
    setEditing(uom);
    setForm({ name: uom.name, code: uom.code, symbol: uom.symbol });
    setShowDialog(true);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "code" ? value.toUpperCase() : value,
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.code.trim() || !form.symbol.trim()) {
      toast.error("Name, Code and Symbol are required");
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/uoms/${editing.id}` : "/api/uoms";
      const method = editing ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          code: form.code,
          symbol: form.symbol,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save UOM"); return; }
      toast.success(editing ? "UOM updated" : "UOM created");
      setShowDialog(false);
      fetchUOMs();
    } catch {
      toast.error("Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Units of Measure"
        description="Manage units used for items and stock"
        actions={
          <PermissionGuard require="warehouse:uom:create">
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4 mr-2" />
              New UOM
            </Button>
          </PermissionGuard>
        }
      />

      {uoms.length === 0 ? (
        <p className="text-muted-foreground text-sm">No units of measure defined yet.</p>
      ) : (
        <div className="rounded-md border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Code</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Symbol</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {uoms.map((uom) => (
                <tr key={uom.id} className="border-t hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <code className="text-xs bg-muted px-1.5 py-0.5 rounded">{uom.code}</code>
                  </td>
                  <td className="px-4 py-3 font-medium">{uom.name}</td>
                  <td className="px-4 py-3 text-muted-foreground font-mono">{uom.symbol}</td>
                  <td className="px-4 py-3">
                    <PermissionGuard require="warehouse:uom:update">
                      <Button variant="outline" size="sm" onClick={() => openEdit(uom)}>
                        <Pencil className="h-3 w-3 mr-1" />
                        Edit
                      </Button>
                    </PermissionGuard>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit UOM" : "New Unit of Measure"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="uom-name">
                Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="uom-name"
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="e.g. Kilogram"
                disabled={submitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="uom-code">
                  Code <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uom-code"
                  name="code"
                  value={form.code}
                  onChange={handleChange}
                  placeholder="e.g. KG"
                  disabled={submitting}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="uom-symbol">
                  Symbol <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="uom-symbol"
                  name="symbol"
                  value={form.symbol}
                  onChange={handleChange}
                  placeholder="e.g. kg"
                  disabled={submitting}
                />
              </div>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} disabled={submitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <LoadingSpinner className="mr-2" />}
                {editing ? "Save Changes" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
