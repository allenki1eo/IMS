"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Calendar } from "lucide-react";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PermissionGuard } from "@/components/shared/PermissionGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";

interface Season {
  id: string;
  name: string;
  startDate: string;
  endDate?: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { bales: number; lots: number };
}

export default function SeasonsPage() {
  const [seasons, setSeasons] = useState<Season[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    startDate: "",
    endDate: "",
    isActive: true,
  });

  function load() {
    setLoading(true);
    fetch("/api/cotton/seasons")
      .then((r) => r.json())
      .then((d) => { if (d.success) setSeasons(d.data); })
      .catch(() => toast.error("Failed to load seasons"))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function handleCreate() {
    if (!form.name || !form.startDate) {
      toast.error("Name and start date are required");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/cotton/seasons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          startDate: form.startDate,
          endDate: form.endDate || null,
          isActive: form.isActive,
        }),
      });
      const d = await res.json();
      if (d.success) {
        toast.success("Season created");
        setOpen(false);
        setForm({ name: "", startDate: "", endDate: "", isActive: true });
        load();
      } else {
        toast.error(d.error ?? "Failed to create season");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Cotton Seasons"
        description="Manage trading seasons"
        actions={
          <PermissionGuard require="cotton:season:create">
            <Button onClick={() => setOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              New Season
            </Button>
          </PermissionGuard>
        }
      />

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : seasons.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">No seasons yet</p>
          <p className="text-sm">Create your first cotton season to get started.</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {seasons.map((season) => (
            <Card key={season.id} className={season.isActive ? "border-primary/40" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{season.name}</CardTitle>
                  <StatusBadge status={season.isActive ? "ACTIVE" : "INACTIVE"} />
                </div>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p className="text-muted-foreground">
                  Start: {new Date(season.startDate).toLocaleDateString()}
                </p>
                {season.endDate && (
                  <p className="text-muted-foreground">
                    End: {new Date(season.endDate).toLocaleDateString()}
                  </p>
                )}
                <div className="flex gap-4 pt-2 font-medium">
                  <span>{season._count.bales} bales</span>
                  <span>{season._count.lots} lots</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Cotton Season</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Season Name *</Label>
              <Input
                placeholder="e.g. 2024/2025"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <Label>Start Date *</Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              />
            </div>
            <div>
              <Label>End Date (optional)</Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
              />
              <Label htmlFor="isActive">Mark as active season</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={saving}>
              {saving ? "Creating..." : "Create Season"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
