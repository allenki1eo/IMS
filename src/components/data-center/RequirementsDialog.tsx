"use client";
import { useEffect, useState } from "react";
import { Loader2, Pencil, Plus } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DATA_CATEGORIES, FREQUENCIES, categoryLabel, frequencyLabel,
} from "@/modules/data-center/data-center.types";
import type { Department, Requirement } from "./types";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const NONE = "__none";

/** "Due 31 January" / "Due on the 7th of the following month" */
export function dueRule(r: Pick<Requirement, "frequency" | "dueMonth" | "dueDay">) {
  const day = r.dueDay >= 31 ? "last day" : ordinal(r.dueDay);
  if (r.frequency === "ANNUAL") return r.dueDay >= 31 ? `Due end of ${MONTHS[r.dueMonth - 1]}` : `Due ${r.dueDay} ${MONTHS[r.dueMonth - 1]}`;
  return `Due on the ${day} of the following month`;
}

function ordinal(n: number) {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

interface FormState {
  id?: string;
  name: string;
  description: string;
  category: string;
  frequency: string;
  dueMonth: number;
  dueDay: number;
  departmentId: string;
}

const EMPTY: FormState = { name: "", description: "", category: "BUDGET", frequency: "ANNUAL", dueMonth: 1, dueDay: 31, departmentId: NONE };

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  departments: Department[];
  onChanged: () => void;
}

export function RequirementsDialog({ open, onOpenChange, departments, onChanged }: Props) {
  const [items, setItems] = useState<Requirement[]>([]);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = () =>
    fetch("/api/data-center/requirements?includeInactive=true")
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d.data) ? d.data : []))
      .catch(() => toast.error("Could not load requirements"));

  useEffect(() => {
    if (open) {
      load();
      setEditing(false);
      setForm(EMPTY);
    }
  }, [open]);

  const set = <K extends keyof FormState>(k: K, v: FormState[K]) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    if (form.name.trim().length < 2) return toast.error("Give the requirement a name");
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      category: form.category,
      frequency: form.frequency,
      dueMonth: form.dueMonth,
      dueDay: form.dueDay,
      departmentId: form.departmentId === NONE ? null : form.departmentId,
    };
    try {
      const res = await fetch(form.id ? `/api/data-center/requirements/${form.id}` : "/api/data-center/requirements", {
        method: form.id ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || body.message || "Could not save");
      toast.success(form.id ? "Requirement updated" : "Requirement added");
      setEditing(false);
      setForm(EMPTY);
      await load();
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (r: Requirement) => {
    const res = await fetch(`/api/data-center/requirements/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.isActive }),
    });
    if (!res.ok) return toast.error("Could not update");
    toast.success(r.isActive ? `“${r.name}” paused — it no longer appears in the checklist` : `“${r.name}” re-activated`);
    await load();
    onChanged();
  };

  const edit = (r: Requirement) => {
    setForm({
      id: r.id, name: r.name, description: r.description ?? "", category: r.category, frequency: r.frequency,
      dueMonth: r.dueMonth, dueDay: r.dueDay, departmentId: r.departmentId ?? NONE,
    });
    setEditing(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Required submissions</DialogTitle>
          <DialogDescription>
            Define what this company must upload and when. Each one appears in the yearly checklist with its due dates.
          </DialogDescription>
        </DialogHeader>

        {editing ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="req-name">Name</Label>
              <Input id="req-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Annual budget, Monthly excise return" autoFocus />
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => set("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DATA_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => set("frequency", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQUENCIES.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.frequency === "ANNUAL" && (
              <div className="space-y-1.5">
                <Label>Due month</Label>
                <Select value={String(form.dueMonth)} onValueChange={(v) => set("dueMonth", Number(v))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{MONTHS.map((m, i) => <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="req-day">
                Due day {form.frequency !== "ANNUAL" && <span className="font-normal text-muted-foreground">(of following month)</span>}
              </Label>
              <Input
                id="req-day"
                type="number"
                min={1}
                max={31}
                value={form.dueDay}
                onChange={(e) => set("dueDay", Math.min(31, Math.max(1, Number(e.target.value) || 1)))}
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Responsible department</Label>
              <Select value={form.departmentId} onValueChange={(v) => set("departmentId", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={NONE}>Company-wide</SelectItem>
                  {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="req-desc">Instructions <span className="font-normal text-muted-foreground">(optional)</span></Label>
              <Textarea id="req-desc" rows={2} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Template to use, who signs off, where it goes…" />
            </div>
            <p className="text-xs text-muted-foreground sm:col-span-2">{dueRule(form)}. Day 31 means the last day of the month.</p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <Button variant="outline" onClick={() => { setEditing(false); setForm(EMPTY); }} disabled={saving}>Cancel</Button>
              <Button onClick={save} disabled={saving}>
                {saving && <Loader2 className="animate-spin" />} {form.id ? "Save changes" : "Add requirement"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="max-h-[50vh] divide-y overflow-y-auto rounded-lg border">
              {items.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-muted-foreground">
                  No requirements yet. Add the files your company has to submit each year, quarter, or month.
                </p>
              )}
              {items.map((r) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className={r.isActive ? "text-sm font-medium" : "text-sm font-medium text-muted-foreground line-through"}>{r.name}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <Badge variant="outline">{categoryLabel(r.category)}</Badge>
                      <span>{frequencyLabel(r.frequency)}</span>·<span>{dueRule(r)}</span>
                      {r.departmentName && <>·<span>{r.departmentName}</span></>}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => edit(r)} aria-label={`Edit ${r.name}`}>
                    <Pencil />
                  </Button>
                  <Switch checked={r.isActive} onCheckedChange={() => toggleActive(r)} aria-label={r.isActive ? `Pause ${r.name}` : `Activate ${r.name}`} />
                </div>
              ))}
            </div>
            <div className="flex justify-end">
              <Button onClick={() => { setForm(EMPTY); setEditing(true); }}>
                <Plus /> Add requirement
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
