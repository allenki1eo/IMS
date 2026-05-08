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

interface Setting {
  id: string;
  key: string;
  value: string;
  category: string;
  description: string | null;
}

export default function SettingsPage() {
  const [settings, setSettings] = useState<Setting[]>([]);
  const [loading, setLoading] = useState(true);
  const [values, setValues] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        const data: Setting[] = d.data ?? [];
        setSettings(data);
        const initial: Record<string, string> = {};
        data.forEach((s) => { initial[s.key] = s.value; });
        setValues(initial);
      })
      .catch(() => toast.error("Failed to load settings"))
      .finally(() => setLoading(false));
  }, []);

  function handleChange(key: string, value: string) {
    setValues((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: Object.entries(values).map(([key, value]) => ({ key, value })),
        }),
      });
      const json = await res.json();
      if (!res.ok) { toast.error(json.error ?? "Failed to save settings"); return; }
      toast.success("Settings saved");
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <LoadingState />;

  // Group by category
  const grouped = settings.reduce<Record<string, Setting[]>>((acc, s) => {
    const cat = s.category ?? "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(s);
    return acc;
  }, {});

  return (
    <div>
      <PageHeader
        title="Settings"
        description="System configuration and preferences"
      />

      <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl">
        {Object.entries(grouped).map(([category, items]) => (
          <Card key={category}>
            <CardHeader>
              <CardTitle className="text-base capitalize">
                {category.replace(/_/g, " ")} Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {items.map((setting) => (
                <div key={setting.key} className="space-y-1">
                  <Label htmlFor={`setting-${setting.key}`}>
                    {setting.key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                  </Label>
                  <Input
                    id={`setting-${setting.key}`}
                    value={values[setting.key] ?? ""}
                    onChange={(e) => handleChange(setting.key, e.target.value)}
                    disabled={saving}
                  />
                  {setting.description && (
                    <p className="text-xs text-muted-foreground">{setting.description}</p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}

        {settings.length === 0 && (
          <div className="text-center text-muted-foreground py-16">No settings found.</div>
        )}

        {settings.length > 0 && (
          <PermissionGuard require="settings:settings:update">
            <Button type="submit" disabled={saving}>
              {saving && <LoadingSpinner className="mr-2" />}
              Save Settings
            </Button>
          </PermissionGuard>
        )}
      </form>
    </div>
  );
}
