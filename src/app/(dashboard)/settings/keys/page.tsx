"use client";

import { useEffect, useState, useCallback } from "react";
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
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Plus,
  Pencil,
  Trash2,
  X,
  Check,
  Key,
  Filter,
} from "lucide-react";

// ---- Types ------------------------------------------------------------------

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
  isPublic: boolean;
  updatedAt: string;
}

interface NewSettingForm {
  key: string;
  value: string;
  category: string;
  description: string;
  isPublic: boolean;
}

interface EditState {
  key: string;
  value: string;
  description: string;
  isPublic: boolean;
}

const CATEGORIES = ["general", "finance", "operations", "notifications", "security", "custom"];

const BLANK_FORM: NewSettingForm = {
  key: "",
  value: "",
  category: "general",
  description: "",
  isPublic: false,
};

// ---- Helpers ----------------------------------------------------------------

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function truncate(str: string, n: number) {
  return str.length > n ? str.slice(0, n) + "…" : str;
}

function categoryColor(cat: string): string {
  switch (cat) {
    case "general": return "bg-blue-100 text-blue-700 border-blue-200";
    case "finance": return "bg-green-100 text-green-700 border-green-200";
    case "operations": return "bg-orange-100 text-orange-700 border-orange-200";
    case "notifications": return "bg-purple-100 text-purple-700 border-purple-200";
    case "security": return "bg-red-100 text-red-700 border-red-200";
    default: return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

// ---- Confirm delete dialog (inline) ----------------------------------------

function DeleteConfirm({
  settingKey,
  onConfirm,
  onCancel,
  loading,
}: {
  settingKey: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">Delete &ldquo;{settingKey}&rdquo;?</span>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 px-2 text-xs"
        onClick={onConfirm}
        disabled={loading}
      >
        {loading ? <LoadingSpinner className="h-3 w-3" /> : "Yes, delete"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="h-7 px-2 text-xs"
        onClick={onCancel}
        disabled={loading}
      >
        Cancel
      </Button>
    </div>
  );
}

// ---- Inline edit row --------------------------------------------------------

function EditRow({
  setting,
  onSave,
  onCancel,
}: {
  setting: Setting;
  onSave: (data: EditState) => Promise<void>;
  onCancel: () => void;
}) {
  const [form, setForm] = useState<EditState>({
    key: setting.key,
    value: setting.value,
    description: setting.description ?? "",
    isPublic: setting.isPublic,
  });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  }

  return (
    <tr className="bg-muted/30">
      <td className="px-4 py-3 font-mono text-sm text-muted-foreground">{setting.key}</td>
      <td className="px-4 py-2">
        <Input
          value={form.value}
          onChange={(e) => setForm((p) => ({ ...p, value: e.target.value }))}
          className="h-8 text-sm"
          placeholder="Value"
        />
      </td>
      <td className="px-4 py-2 text-muted-foreground text-sm">{setting.category}</td>
      <td className="px-4 py-2">
        <Input
          value={form.description}
          onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
          className="h-8 text-sm"
          placeholder="Description (optional)"
        />
      </td>
      <td className="px-4 py-2">
        <button
          type="button"
          onClick={() => setForm((p) => ({ ...p, isPublic: !p.isPublic }))}
          className={cn(
            "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors",
            form.isPublic ? "bg-primary" : "bg-input"
          )}
        >
          <span
            className={cn(
              "pointer-events-none block h-3 w-3 rounded-full bg-background shadow-lg ring-0 transition-transform",
              form.isPublic ? "translate-x-4" : "translate-x-0"
            )}
          />
        </button>
      </td>
      <td className="px-4 py-2 text-muted-foreground text-xs">—</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-1.5">
          <Button
            size="sm"
            className="h-7 px-2"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? <LoadingSpinner className="h-3 w-3" /> : <Check className="h-3.5 w-3.5" />}
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 px-2"
            onClick={onCancel}
            disabled={saving}
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ---- Main page --------------------------------------------------------------

export default function SettingsKeysPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterCategory, setFilterCategory] = useState<string>("all");
  const [showAddForm, setShowAddForm] = useState(false);
  const [newForm, setNewForm] = useState<NewSettingForm>(BLANK_FORM);
  const [adding, setAdding] = useState(false);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [deletingKey, setDeletingKey] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadSettings = useCallback(() => {
    setLoading(true);
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setSettings(d.data ?? []);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const filtered = filterCategory === "all"
    ? settings
    : settings.filter((s) => s.category === filterCategory);

  // ---- Add new setting ----
  async function handleAdd() {
    if (!newForm.key.trim()) {
      toast.error("Key is required");
      return;
    }
    if (!/^[a-z0-9_]+$/.test(newForm.key)) {
      toast.error("Key must be lowercase letters, numbers, and underscores only");
      return;
    }
    setAdding(true);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: newForm.key,
          value: newForm.value,
          category: newForm.category,
          description: newForm.description || undefined,
          isPublic: newForm.isPublic,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to create setting");
        return;
      }
      toast.success(`Setting "${newForm.key}" created`);
      setNewForm(BLANK_FORM);
      setShowAddForm(false);
      loadSettings();
    } catch {
      toast.error("Network error");
    } finally {
      setAdding(false);
    }
  }

  // ---- Edit existing setting ----
  async function handleEdit(key: string, data: EditState) {
    const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        value: data.value,
        description: data.description,
        isPublic: data.isPublic,
      }),
    });
    const json = await res.json();
    if (!res.ok) {
      toast.error(json.error ?? "Failed to update setting");
      throw new Error(json.error);
    }
    toast.success(`Setting "${key}" updated`);
    setEditingKey(null);
    loadSettings();
  }

  // ---- Delete setting ----
  async function handleDelete(key: string) {
    setDeleting(true);
    try {
      const res = await fetch(`/api/settings/${encodeURIComponent(key)}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Failed to delete setting");
        return;
      }
      toast.success(`Setting "${key}" deleted`);
      setDeletingKey(null);
      loadSettings();
    } catch {
      toast.error("Network error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <LoadingState />;

  return (
    <div>
      <PageHeader
        title="Manage Settings Keys"
        description={`${settings.length} setting${settings.length !== 1 ? "s" : ""} in the database`}
      />

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-4 mt-6 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-44 h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c.charAt(0).toUpperCase() + c.slice(1)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">
            {filtered.length} shown
          </span>
        </div>

        <PermissionGuard require="settings:settings:update">
          <Button
            onClick={() => {
              setShowAddForm((v) => !v);
              setNewForm(BLANK_FORM);
            }}
            className="gap-2"
            size="sm"
          >
            {showAddForm ? (
              <>
                <X className="h-4 w-4" />
                Cancel
              </>
            ) : (
              <>
                <Plus className="h-4 w-4" />
                Add Setting
              </>
            )}
          </Button>
        </PermissionGuard>
      </div>

      {/* Add new setting form */}
      {showAddForm && (
        <Card className="mb-6 border-dashed border-primary/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Key className="h-4 w-4" />
              New Setting
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="new-key">Key <span className="text-destructive">*</span></Label>
                <Input
                  id="new-key"
                  placeholder="e.g. my_setting_key"
                  value={newForm.key}
                  onChange={(e) => setNewForm((p) => ({ ...p, key: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "_") }))}
                  disabled={adding}
                />
                <p className="text-xs text-muted-foreground">Lowercase, numbers, underscores only</p>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-value">Value</Label>
                <Input
                  id="new-value"
                  placeholder="Setting value"
                  value={newForm.value}
                  onChange={(e) => setNewForm((p) => ({ ...p, value: e.target.value }))}
                  disabled={adding}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="new-category">Category</Label>
                <Select
                  value={newForm.category}
                  onValueChange={(v) => setNewForm((p) => ({ ...p, category: v }))}
                  disabled={adding}
                >
                  <SelectTrigger id="new-category">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c.charAt(0).toUpperCase() + c.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 md:col-span-2">
                <Label htmlFor="new-description">Description</Label>
                <Input
                  id="new-description"
                  placeholder="Optional description"
                  value={newForm.description}
                  onChange={(e) => setNewForm((p) => ({ ...p, description: e.target.value }))}
                  disabled={adding}
                />
              </div>

              <div className="space-y-1.5">
                <Label>Public</Label>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setNewForm((p) => ({ ...p, isPublic: !p.isPublic }))}
                    disabled={adding}
                    className={cn(
                      "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors disabled:cursor-not-allowed disabled:opacity-50",
                      newForm.isPublic ? "bg-primary" : "bg-input"
                    )}
                  >
                    <span
                      className={cn(
                        "pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform",
                        newForm.isPublic ? "translate-x-5" : "translate-x-0"
                      )}
                    />
                  </button>
                  <span className="text-sm text-muted-foreground">
                    {newForm.isPublic ? "Visible to all authenticated users" : "Internal only"}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 flex items-center gap-2">
              <Button onClick={handleAdd} disabled={adding} size="sm" className="gap-2">
                {adding ? <LoadingSpinner className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                Create Setting
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setShowAddForm(false);
                  setNewForm(BLANK_FORM);
                }}
                disabled={adding}
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Key</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Value</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Category</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Description</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Public</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Last Updated</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-muted-foreground">
                    No settings found
                    {filterCategory !== "all" && ` in category "${filterCategory}"`}.
                  </td>
                </tr>
              )}
              {filtered.map((s) => {
                if (editingKey === s.key) {
                  return (
                    <EditRow
                      key={s.key}
                      setting={s}
                      onSave={(data) => handleEdit(s.key, data)}
                      onCancel={() => setEditingKey(null)}
                    />
                  );
                }

                return (
                  <tr key={s.key} className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded">
                        {s.key}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[180px]">
                      <span title={s.value}>{truncate(s.value, 40)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
                          categoryColor(s.category)
                        )}
                      >
                        {s.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground max-w-[200px]">
                      <span title={s.description ?? ""}>{truncate(s.description ?? "—", 40)}</span>
                    </td>
                    <td className="px-4 py-3">
                      {s.isPublic ? (
                        <Badge variant="outline" className="text-xs border-green-300 text-green-700">
                          Public
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-xs text-muted-foreground">
                          Private
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                      {formatDate(s.updatedAt)}
                    </td>
                    <td className="px-4 py-3">
                      {deletingKey === s.key ? (
                        <DeleteConfirm
                          settingKey={s.key}
                          onConfirm={() => handleDelete(s.key)}
                          onCancel={() => setDeletingKey(null)}
                          loading={deleting}
                        />
                      ) : (
                        <PermissionGuard require="settings:settings:update">
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2"
                              title="Edit"
                              onClick={() => {
                                setDeletingKey(null);
                                setEditingKey(s.key);
                              }}
                            >
                              <Pencil className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-destructive hover:text-destructive hover:border-destructive"
                              title="Delete"
                              onClick={() => {
                                setEditingKey(null);
                                setDeletingKey(s.key);
                              }}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </PermissionGuard>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
