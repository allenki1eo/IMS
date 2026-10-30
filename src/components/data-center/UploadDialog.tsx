"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { CloudUpload, FileText, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ALLOWED_EXTENSIONS, DATA_CATEGORIES, categoryLabel, extensionOf, formatBytes,
  frequencyLabel, periodLabel, periodsFor,
} from "@/modules/data-center/data-center.types";
import type { Department, Requirement } from "./types";

const AD_HOC = "__adhoc";
const NONE = "__none";

export interface UploadDefaults {
  requirementId?: string;
  periodKey?: string;
}

interface UploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
  requirements: Requirement[];
  departments: Department[];
  defaults?: UploadDefaults;
  onUploaded: () => void;
}

export function UploadDialog({ open, onOpenChange, year, requirements, departments, defaults, onUploaded }: UploadDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [requirementId, setRequirementId] = useState(AD_HOC);
  const [periodYear, setPeriodYear] = useState(year);
  const [periodKey, setPeriodKey] = useState(String(year));
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("OTHER");
  const [departmentId, setDepartmentId] = useState(NONE);
  const [description, setDescription] = useState("");
  const [progress, setProgress] = useState<number | null>(null);

  const requirement = requirements.find((r) => r.id === requirementId) ?? null;
  const periods = useMemo(
    () => periodsFor(requirement?.frequency ?? "ANNUAL", periodYear),
    [requirement, periodYear]
  );
  const years = [year - 2, year - 1, year, year + 1];

  // Reset whenever the dialog opens, applying any prefill from a checklist chip.
  useEffect(() => {
    if (!open) return;
    const req = requirements.find((r) => r.id === defaults?.requirementId);
    const key = defaults?.periodKey ?? String(year);
    setFile(null);
    setRequirementId(req?.id ?? AD_HOC);
    setPeriodYear(Number(key.slice(0, 4)) || year);
    setPeriodKey(key);
    setTitle("");
    setCategory(req?.category ?? "OTHER");
    setDepartmentId(req?.departmentId ?? NONE);
    setDescription("");
    setProgress(null);
  }, [open, defaults, requirements, year]);

  // Keep the period valid for the chosen requirement and year.
  useEffect(() => {
    if (!periods.includes(periodKey)) setPeriodKey(periods[0]);
  }, [periods, periodKey]);

  const pick = (f: File | undefined | null) => {
    if (!f) return;
    if (!ALLOWED_EXTENSIONS.includes(extensionOf(f.name))) {
      toast.error(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(" ")}`);
      return;
    }
    setFile(f);
    if (!title) setTitle(f.name.replace(/\.[^.]+$/, ""));
  };

  const onRequirementChange = (id: string) => {
    setRequirementId(id);
    const req = requirements.find((r) => r.id === id);
    if (req) {
      setCategory(req.category);
      if (req.departmentId) setDepartmentId(req.departmentId);
    }
  };

  const submit = () => {
    if (!file) return toast.error("Choose a file to upload");
    const form = new FormData();
    form.set("file", file);
    form.set("title", title.trim() || file.name.replace(/\.[^.]+$/, ""));
    form.set("periodKey", periodKey);
    form.set("category", category);
    if (requirement) form.set("requirementId", requirement.id);
    if (departmentId !== NONE) form.set("departmentId", departmentId);
    if (description.trim()) form.set("description", description.trim());

    // XHR rather than fetch so we can show real upload progress.
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/data-center/uploads");
    xhr.upload.onprogress = (e) => e.lengthComputable && setProgress(Math.round((e.loaded / e.total) * 100));
    xhr.onload = () => {
      setProgress(null);
      let body: { error?: string; message?: string; data?: { version?: number } } = {};
      try { body = JSON.parse(xhr.responseText); } catch { /* non-JSON error page */ }
      if (xhr.status >= 200 && xhr.status < 300) {
        const v = body.data?.version;
        toast.success(v && v > 1 ? `Uploaded as version ${v} — the previous file was kept in history` : "File uploaded");
        onOpenChange(false);
        onUploaded();
      } else {
        toast.error(body.error || body.message || (xhr.status === 413 ? "File is too large for the server" : "Upload failed"));
      }
    };
    xhr.onerror = () => {
      setProgress(null);
      toast.error("Upload failed — check your connection and try again");
    };
    setProgress(0);
    xhr.send(form);
  };

  const busy = progress !== null;

  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload file</DialogTitle>
          <DialogDescription>
            {requirement
              ? `For “${requirement.name}” — ${frequencyLabel(requirement.frequency).toLowerCase()} submission.`
              : "Attach a file to a required submission, or store it as an ad-hoc file for the year."}
          </DialogDescription>
        </DialogHeader>

        {/* Drop zone */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files?.[0]); }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            dragging ? "border-foreground/40 bg-muted" : "border-border hover:border-foreground/25 hover:bg-muted/50"
          )}
        >
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            accept={ALLOWED_EXTENSIONS.join(",")}
            onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
          />
          {file ? (
            <div className="flex w-full items-center gap-3 text-left">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatBytes(file.size)}</p>
              </div>
              {!busy && (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  aria-label="Remove file"
                  onClick={(e) => { e.stopPropagation(); setFile(null); }}
                >
                  <X />
                </Button>
              )}
            </div>
          ) : (
            <>
              <CloudUpload className="mb-2 h-7 w-7 text-muted-foreground" />
              <p className="text-sm font-medium">Drop a file here, or click to browse</p>
              <p className="mt-1 text-xs text-muted-foreground">Excel, CSV, PDF, Word, images or ZIP</p>
            </>
          )}
        </div>

        {busy && (
          <div className="space-y-1" aria-live="polite">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground transition-[width]" style={{ width: `${progress}%` }} />
            </div>
            <p className="text-right text-xs tabular-nums text-muted-foreground">{progress}%</p>
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5 sm:col-span-2">
            <Label>Submission for</Label>
            <Select value={requirementId} onValueChange={onRequirementChange} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={AD_HOC}>Ad-hoc file (no requirement)</SelectItem>
                {requirements.map((r) => (
                  <SelectItem key={r.id} value={r.id}>
                    {r.name} · {frequencyLabel(r.frequency)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Year</Label>
            <Select value={String(periodYear)} onValueChange={(v) => setPeriodYear(Number(v))} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Period</Label>
            <Select value={periodKey} onValueChange={setPeriodKey} disabled={busy || periods.length === 1}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {periods.map((p) => <SelectItem key={p} value={p}>{periodLabel(p)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="upload-title">Title</Label>
            <Input
              id="upload-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Defaults to the file name"
              disabled={busy}
            />
          </div>

          <div className="space-y-1.5">
            <Label>Category</Label>
            <Select value={category} onValueChange={setCategory} disabled={busy || !!requirement}>
              <SelectTrigger><SelectValue>{categoryLabel(category)}</SelectValue></SelectTrigger>
              <SelectContent>
                {DATA_CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId} disabled={busy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={NONE}>Company-wide</SelectItem>
                {departments.map((d) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="upload-notes">Notes <span className="font-normal text-muted-foreground">(optional)</span></Label>
            <Textarea
              id="upload-notes"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What changed, who approved it, source…"
              disabled={busy}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={!file || busy}>
            {busy ? <><Loader2 className="animate-spin" /> Uploading…</> : <><CloudUpload /> Upload</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
