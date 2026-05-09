"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { ArrowLeft, Plus, Trash2, FlaskConical } from "lucide-react";
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

interface Parameter {
  id: string;
  name: string;
  unit?: string | null;
  minValue?: number | null;
  maxValue?: number | null;
  targetValue?: number | null;
  isRequired: boolean;
  sortOrder: number;
}

interface Standard {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  item?: { id: string; name: string } | null;
  parameters: Parameter[];
}

interface ItemOption {
  id: string;
  name: string;
  code?: string;
}

interface EditForm {
  code: string;
  name: string;
  itemId: string;
  description: string;
}

interface ParamForm {
  name: string;
  unit: string;
  minValue: string;
  maxValue: string;
  targetValue: string;
  isRequired: boolean;
  sortOrder: string;
}

const PARAM_DEFAULT: ParamForm = {
  name: "",
  unit: "",
  minValue: "",
  maxValue: "",
  targetValue: "",
  isRequired: false,
  sortOrder: "",
};

export default function QcStandardDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [standard, setStandard] = useState<Standard | null>(null);
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ItemOption[]>([]);
  const [editForm, setEditForm] = useState<EditForm>({ code: "", name: "", itemId: "", description: "" });
  const [saving, setSaving] = useState(false);
  const [showAddParam, setShowAddParam] = useState(false);
  const [paramForm, setParamForm] = useState<ParamForm>(PARAM_DEFAULT);
  const [addingParam, setAddingParam] = useState(false);

  const loadData = useCallback(() => {
    setLoading(true);
    Promise.all([
      fetch(`/api/qc/standards/${id}`).then((r) => r.json()),
      fetch("/api/items?pageSize=200").then((r) => r.json()),
    ])
      .then(([stdData, itemsData]) => {
        const std: Standard = stdData.data;
        setStandard(std);
        setEditForm({
          code: std.code,
          name: std.name,
          itemId: std.item?.id ?? "",
          description: std.description ?? "",
        });
        setItems(itemsData.data ?? []);
      })
      .catch(() => toast.error("Failed to load standard"))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleSaveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editForm.code.trim() || !editForm.name.trim()) {
      toast.error("Code and name are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/qc/standards/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: editForm.code.trim(),
          name: editForm.name.trim(),
          itemId: editForm.itemId || undefined,
          description: editForm.description.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to update standard"); return; }
      setStandard((prev) => prev ? { ...prev, ...json.data } : prev);
      toast.success("Standard updated");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  async function handleAddParam(e: React.FormEvent) {
    e.preventDefault();
    if (!paramForm.name.trim()) {
      toast.error("Parameter name is required");
      return;
    }
    setAddingParam(true);
    try {
      const res = await fetch(`/api/qc/standards/${id}/parameters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: paramForm.name.trim(),
          unit: paramForm.unit.trim() || undefined,
          minValue: paramForm.minValue ? parseFloat(paramForm.minValue) : undefined,
          maxValue: paramForm.maxValue ? parseFloat(paramForm.maxValue) : undefined,
          targetValue: paramForm.targetValue ? parseFloat(paramForm.targetValue) : undefined,
          isRequired: paramForm.isRequired,
          sortOrder: paramForm.sortOrder ? parseInt(paramForm.sortOrder) : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to add parameter"); return; }
      setStandard((prev) => prev ? { ...prev, parameters: [...prev.parameters, json.data] } : prev);
      setParamForm(PARAM_DEFAULT);
      setShowAddParam(false);
      toast.success("Parameter added");
    } catch {
      toast.error("Network error");
    } finally {
      setAddingParam(false);
    }
  }

  async function handleDeleteParam(paramId: string) {
    try {
      const res = await fetch(`/api/qc/standards/${id}/parameters/${paramId}`, {
        method: "DELETE",
      });
      if (!res.ok) { const j = await res.json(); toast.error(j.error ?? "Failed to delete parameter"); return; }
      setStandard((prev) => prev ? { ...prev, parameters: prev.parameters.filter((p) => p.id !== paramId) } : prev);
      toast.success("Parameter removed");
    } catch {
      toast.error("Network error");
    }
  }

  if (loading) return <LoadingState />;
  if (!standard) return <div className="text-muted-foreground">Standard not found.</div>;

  return (
    <div>
      <PageHeader
        title={standard.name}
        description={`Code: ${standard.code}`}
        actions={
          <div className="flex gap-2">
            <Button asChild>
              <Link href={`/qc/tests/new?standardId=${standard.id}`}>
                <FlaskConical className="h-4 w-4 mr-2" />
                Create Test
              </Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/qc/standards">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Link>
            </Button>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        {/* Info card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Standard Info</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Code</p>
              <p className="font-medium mt-1"><code className="bg-muted px-1.5 py-0.5 rounded text-xs">{standard.code}</code></p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <p className="mt-1 text-sm font-medium">{standard.isActive ? "Active" : "Inactive"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-muted-foreground">Linked Item</p>
              <p className="mt-1">{standard.item?.name ?? "—"}</p>
            </div>
            {standard.description && (
              <div className="col-span-2">
                <p className="text-muted-foreground">Description</p>
                <p className="mt-1">{standard.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Edit form */}
        <PermissionGuard require="qc:standard:update">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Edit Standard</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveEdit} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="edit-code">Code <span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-code"
                      value={editForm.code}
                      onChange={(e) => setEditForm((p) => ({ ...p, code: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="edit-name">Name <span className="text-destructive">*</span></Label>
                    <Input
                      id="edit-name"
                      value={editForm.name}
                      onChange={(e) => setEditForm((p) => ({ ...p, name: e.target.value }))}
                      disabled={saving}
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Linked Item</Label>
                  <Select
                    value={editForm.itemId || "__none"}
                    onValueChange={(v) => setEditForm((p) => ({ ...p, itemId: v === "__none" ? "" : v }))}
                    disabled={saving}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No linked item" />
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
                  <Label htmlFor="edit-desc">Description</Label>
                  <textarea
                    id="edit-desc"
                    value={editForm.description}
                    onChange={(e) => setEditForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    disabled={saving}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50 resize-none"
                  />
                </div>
                <Button type="submit" size="sm" disabled={saving}>
                  {saving && <LoadingSpinner className="mr-2" />}
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>
        </PermissionGuard>
      </div>

      {/* Parameters */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Test Parameters ({standard.parameters.length})</CardTitle>
          <PermissionGuard require="qc:standard:update">
            <Button size="sm" onClick={() => setShowAddParam(!showAddParam)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Parameter
            </Button>
          </PermissionGuard>
        </CardHeader>
        <CardContent className="p-0">
          {showAddParam && (
            <div className="px-4 py-4 border-b bg-muted/20">
              <form onSubmit={handleAddParam} className="space-y-3">
                <p className="text-sm font-medium">Add Parameter</p>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Name <span className="text-destructive">*</span></Label>
                    <Input
                      className="h-8"
                      value={paramForm.name}
                      onChange={(e) => setParamForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="e.g. pH Level"
                      disabled={addingParam}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Unit</Label>
                    <Input
                      className="h-8"
                      value={paramForm.unit}
                      onChange={(e) => setParamForm((p) => ({ ...p, unit: e.target.value }))}
                      placeholder="e.g. pH, %, mg/L"
                      disabled={addingParam}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Sort Order</Label>
                    <Input
                      className="h-8"
                      type="number"
                      min="0"
                      value={paramForm.sortOrder}
                      onChange={(e) => setParamForm((p) => ({ ...p, sortOrder: e.target.value }))}
                      placeholder="e.g. 1"
                      disabled={addingParam}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Min Value</Label>
                    <Input
                      className="h-8"
                      type="number"
                      step="any"
                      value={paramForm.minValue}
                      onChange={(e) => setParamForm((p) => ({ ...p, minValue: e.target.value }))}
                      placeholder="Min"
                      disabled={addingParam}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Target Value</Label>
                    <Input
                      className="h-8"
                      type="number"
                      step="any"
                      value={paramForm.targetValue}
                      onChange={(e) => setParamForm((p) => ({ ...p, targetValue: e.target.value }))}
                      placeholder="Target"
                      disabled={addingParam}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Max Value</Label>
                    <Input
                      className="h-8"
                      type="number"
                      step="any"
                      value={paramForm.maxValue}
                      onChange={(e) => setParamForm((p) => ({ ...p, maxValue: e.target.value }))}
                      placeholder="Max"
                      disabled={addingParam}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    id="isRequired"
                    type="checkbox"
                    checked={paramForm.isRequired}
                    onChange={(e) => setParamForm((p) => ({ ...p, isRequired: e.target.checked }))}
                    disabled={addingParam}
                    className="h-4 w-4 rounded border-input"
                  />
                  <Label htmlFor="isRequired" className="text-xs cursor-pointer">Required parameter</Label>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={addingParam}>
                    {addingParam && <LoadingSpinner className="mr-1" />}
                    Add
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => setShowAddParam(false)} disabled={addingParam}>
                    Cancel
                  </Button>
                </div>
              </form>
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Unit</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Min</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Target</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Max</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Required</th>
                  <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {standard.parameters.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                      No parameters defined yet
                    </td>
                  </tr>
                ) : (
                  [...standard.parameters]
                    .sort((a, b) => a.sortOrder - b.sortOrder)
                    .map((param) => (
                      <tr key={param.id} className="border-t hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">{param.name}</td>
                        <td className="px-4 py-3 text-muted-foreground">{param.unit ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{param.minValue ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{param.targetValue ?? "—"}</td>
                        <td className="px-4 py-3 text-muted-foreground">{param.maxValue ?? "—"}</td>
                        <td className="px-4 py-3">
                          {param.isRequired ? (
                            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700">Yes</span>
                          ) : (
                            <span className="text-muted-foreground text-xs">No</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <PermissionGuard require="qc:standard:update">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              onClick={() => handleDeleteParam(param.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </PermissionGuard>
                        </td>
                      </tr>
                    ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
