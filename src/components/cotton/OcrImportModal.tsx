"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

interface Season {
  id: string;
  name: string;
}

interface LotEntry {
  lotNumber: string;
  seasonId: string;
  description: string;
}

interface OcrImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  seasons: Season[];
  defaultSeasonId?: string;
}

export function OcrImportModal({
  open,
  onClose,
  onSuccess,
  seasons,
  defaultSeasonId,
}: OcrImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [lotEntries, setLotEntries] = useState<LotEntry[]>([]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    const url = URL.createObjectURL(file);
    setImagePreview(url);
    setLotEntries([]);
  }

  async function handleExtract() {
    if (!imageFile) return;
    setExtracting(true);
    try {
      const formData = new FormData();
      formData.append("image", imageFile);
      const res = await fetch("/api/cotton/ocr", { method: "POST", body: formData });
      const d = await res.json();
      if (!d.success) {
        toast.error(d.error ?? "OCR failed");
        return;
      }
      if (d.data?.error === "OCR_NOT_CONFIGURED") {
        toast.warning(d.data.message ?? "OCR not configured");
        return;
      }
      const lotNumbers: string[] = d.data?.lotNumbers ?? [];
      if (lotNumbers.length === 0) {
        toast.info("No lot numbers detected. You can add them manually below.");
      } else {
        toast.success(`Detected ${lotNumbers.length} lot numbers`);
      }
      setLotEntries(
        lotNumbers.map((n) => ({
          lotNumber: n,
          seasonId: defaultSeasonId ?? seasons[0]?.id ?? "",
          description: "",
        }))
      );
    } catch {
      toast.error("Failed to extract lot numbers");
    } finally {
      setExtracting(false);
    }
  }

  function addEntry() {
    setLotEntries([
      ...lotEntries,
      { lotNumber: "", seasonId: defaultSeasonId ?? seasons[0]?.id ?? "", description: "" },
    ]);
  }

  function removeEntry(idx: number) {
    setLotEntries(lotEntries.filter((_, i) => i !== idx));
  }

  function updateEntry(idx: number, field: keyof LotEntry, value: string) {
    setLotEntries(lotEntries.map((e, i) => (i === idx ? { ...e, [field]: value } : e)));
  }

  async function handleCreate() {
    const valid = lotEntries.filter((e) => e.lotNumber.trim() && e.seasonId);
    if (valid.length === 0) {
      toast.error("No valid lot entries to create");
      return;
    }
    setSaving(true);
    let created = 0;
    let failed = 0;
    for (const entry of valid) {
      try {
        const res = await fetch("/api/cotton/lots", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            seasonId: entry.seasonId,
            lotNumber: entry.lotNumber.trim(),
            description: entry.description || null,
          }),
        });
        const d = await res.json();
        if (d.success) created++;
        else failed++;
      } catch {
        failed++;
      }
    }
    setSaving(false);
    if (created > 0) {
      toast.success(`Created ${created} lot${created !== 1 ? "s" : ""}${failed > 0 ? ` (${failed} failed)` : ""}`);
      onSuccess();
      handleClose();
    } else {
      toast.error("Failed to create lots");
    }
  }

  function handleClose() {
    setImageFile(null);
    setImagePreview(null);
    setLotEntries([]);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Lots via OCR</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>Photo of Lot Sheet</Label>
            <div className="mt-1 flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} type="button">
                <Camera className="h-4 w-4 mr-2" />
                Select Image
              </Button>
              {imageFile && (
                <Button onClick={handleExtract} disabled={extracting} type="button">
                  {extracting ? "Extracting..." : "Extract Lot Numbers"}
                </Button>
              )}
            </div>
            {imagePreview && (
              <div className="mt-3 max-h-48 overflow-hidden rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Selected lot sheet" className="w-full object-contain max-h-48" />
              </div>
            )}
          </div>

          {/* Lot entries */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label>Lot Entries ({lotEntries.length})</Label>
              <Button variant="outline" size="sm" onClick={addEntry} type="button">
                <Plus className="h-4 w-4 mr-1" />
                Add Row
              </Button>
            </div>

            {lotEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4 border rounded bg-muted/20">
                Extract from image or add rows manually
              </p>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {lotEntries.map((entry, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <Input
                        placeholder="Lot number"
                        value={entry.lotNumber}
                        onChange={(e) => updateEntry(idx, "lotNumber", e.target.value)}
                      />
                    </div>
                    <div className="w-36">
                      <Select
                        value={entry.seasonId}
                        onValueChange={(v) => updateEntry(idx, "seasonId", v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Season" />
                        </SelectTrigger>
                        <SelectContent>
                          {seasons.map((s) => (
                            <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1">
                      <Input
                        placeholder="Description (opt.)"
                        value={entry.description}
                        onChange={(e) => updateEntry(idx, "description", e.target.value)}
                      />
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => removeEntry(idx)} type="button">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || lotEntries.length === 0}>
            {saving ? "Creating..." : `Create ${lotEntries.filter((e) => e.lotNumber.trim()).length} Lot(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
