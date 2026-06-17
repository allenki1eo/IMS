"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";
import { Camera, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter,
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

// Lot number patterns — ordered most-specific first
const LOT_PATTERNS: RegExp[] = [
  /\bLOT[#\-\s]?\d{2,6}\b/gi,
  /\b[A-Z]{1,5}[-/]?\d{2,6}\b/gi,
  /\b\d{4,6}\b/g,
];

// Classic OCR confusion-pair fixes
const OCR_CORRECTIONS: [RegExp, string][] = [
  [/\bO(?=\d)/g, "0"],
  [/(?<=\d)O\b/g, "0"],
  [/\bI(?=\d)/g, "1"],
  [/(?<=\d)l\b/g, "1"],
  [/\bS(?=\d)/g, "5"],
];

function applyCorrections(text: string): string {
  let out = text;
  for (const [pattern, replacement] of OCR_CORRECTIONS) {
    out = out.replace(pattern, replacement);
  }
  return out;
}

function extractLotNumbers(rawText: string): string[] {
  const text = applyCorrections(rawText);
  const found = new Set<string>();
  const seen = new Set<string>();
  for (const pattern of LOT_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      const key = `${match.index}-${match.index + match[0].length}`;
      if (seen.has(key)) continue;
      seen.add(key);
      found.add(match[0].toUpperCase().replace(/[\s#]/g, "").trim());
    }
  }
  return Array.from(found);
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
  const [progress, setProgress] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [lotEntries, setLotEntries] = useState<LotEntry[]>([]);
  const [rawText, setRawText] = useState<string>("");
  const [lowConfidence, setLowConfidence] = useState<{ text: string; confidence: number }[]>([]);
  const [showRaw, setShowRaw] = useState(false);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setLotEntries([]);
    setRawText("");
    setLowConfidence([]);
    setShowRaw(false);
  }

  async function handleExtract() {
    if (!imageFile) return;
    setExtracting(true);
    setProgress("Loading OCR engine...");
    try {
      // Run Tesseract in the browser — avoids Vercel serverless timeouts
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng", 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") {
            setProgress(`Recognising... ${Math.round(m.progress * 100)}%`);
          } else if (m.status) {
            setProgress(m.status);
          }
        },
      });

      await worker.setParameters({
        tessedit_pageseg_mode: "6" as never,
        tessedit_char_whitelist:
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-/#. \n",
        preserve_interword_spaces: "1" as never,
      });

      const { data } = await worker.recognize(imageFile);
      await worker.terminate();

      const text: string = data.text ?? "";
      const lotNumbers = extractLotNumbers(text);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const words: { confidence: number; text: string }[] = (data as any).words ?? [];
      const lowConf = words
        .filter((w) => w.confidence < 60 && w.text.trim())
        .map((w) => ({ text: w.text, confidence: Math.round(w.confidence) }));

      setRawText(text);
      setLowConfidence(lowConf);
      setShowRaw(false);

      if (lotNumbers.length === 0) {
        toast.info("No lot numbers detected. You can add them manually below.");
      } else {
        toast.success(`Detected ${lotNumbers.length} lot number${lotNumbers.length !== 1 ? "s" : ""}`);
      }

      setLotEntries(
        lotNumbers.map((n) => ({
          lotNumber: n,
          seasonId: defaultSeasonId ?? seasons[0]?.id ?? "",
          description: "",
        }))
      );
    } catch (err) {
      console.error(err);
      toast.error("OCR failed. Please try again or add lot numbers manually.");
    } finally {
      setExtracting(false);
      setProgress("");
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
    setRawText("");
    setLowConfidence([]);
    setShowRaw(false);
    setProgress("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Lots via OCR</DialogTitle>
          <DialogDescription>
            Upload a photo of a lot sheet to extract lot numbers automatically, or add them manually.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Image upload */}
          <div>
            <Label>Photo of Lot Sheet</Label>
            <div className="mt-1 flex gap-2 flex-wrap">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} type="button" disabled={extracting}>
                <Camera className="h-4 w-4 mr-2" />
                Select Image
              </Button>
              {imageFile && (
                <Button onClick={handleExtract} disabled={extracting} type="button">
                  {extracting ? (progress || "Extracting...") : "Extract Lot Numbers"}
                </Button>
              )}
            </div>
            {imagePreview && (
              <div className="mt-3 max-h-48 overflow-hidden rounded border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imagePreview} alt="Selected lot sheet" className="w-full object-contain max-h-48" />
              </div>
            )}
            {extracting && (
              <p className="mt-2 text-xs text-muted-foreground animate-pulse">{progress || "Processing..."}</p>
            )}
          </div>

          {/* OCR confidence warnings */}
          {lowConfidence.length > 0 && (
            <div className="rounded border border-yellow-300 bg-yellow-50 px-3 py-2 text-sm text-yellow-800">
              <p className="font-medium mb-1">Low-confidence words — review extracted numbers carefully:</p>
              <p className="text-xs">{lowConfidence.map((w) => `"${w.text}" (${w.confidence}%)`).join(", ")}</p>
            </div>
          )}

          {/* Raw OCR text toggle */}
          {rawText && (
            <div>
              <button
                type="button"
                className="text-xs text-muted-foreground underline"
                onClick={() => setShowRaw((v) => !v)}
              >
                {showRaw ? "Hide" : "Show"} raw OCR text
              </button>
              {showRaw && (
                <pre className="mt-1 max-h-32 overflow-y-auto rounded border bg-muted/30 p-2 text-xs whitespace-pre-wrap">
                  {rawText}
                </pre>
              )}
            </div>
          )}

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
          <Button variant="outline" onClick={handleClose} disabled={extracting}>Cancel</Button>
          <Button onClick={handleCreate} disabled={saving || extracting || lotEntries.length === 0}>
            {saving ? "Creating..." : `Create ${lotEntries.filter((e) => e.lotNumber.trim()).length} Lot(s)`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
