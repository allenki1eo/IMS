"use client";

import { useState, useRef } from "react";
import { Download, Upload, X, AlertCircle, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface ImportModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  title: string;
  apiEndpoint: string;
  templateHeaders: string[];
  templateFilename: string;
  instructions?: string[];
}

interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function parseCsv(text: string): ParsedCsv {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length === 0) return { headers: [], rows: [] };
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const rows = lines.slice(1).map((line) => {
    const values = line.split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    return Object.fromEntries(headers.map((h, i) => [h, values[i] ?? ""]));
  });
  return { headers, rows };
}

function downloadTemplateCsv(headers: string[], filename: string) {
  const csv = headers.map((h) => JSON.stringify(h)).join(",");
  const blob = new Blob([csv + "\n"], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

type ImportState = "idle" | "preview" | "importing" | "done";

interface ImportResult {
  imported: number;
  skipped: number;
  errors: string[];
}

export function ImportModal({
  open,
  onClose,
  onSuccess,
  title,
  apiEndpoint,
  templateHeaders,
  templateFilename,
  instructions,
}: ImportModalProps) {
  const [state, setState] = useState<ImportState>("idle");
  const [parsed, setParsed] = useState<ParsedCsv | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [result, setResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setState("idle");
    setParsed(null);
    setFileName("");
    setResult(null);
    setImportError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const data = parseCsv(text);
      setParsed(data);
      setState("preview");
      setResult(null);
      setImportError(null);
    };
    reader.readAsText(file);
  }

  async function handleImport() {
    if (!parsed || parsed.rows.length === 0) return;
    setState("importing");
    setImportError(null);
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: parsed.rows }),
      });
      const json = await res.json();
      if (!res.ok) {
        setImportError(json.error ?? "Import failed");
        setState("preview");
        return;
      }
      setResult(json.data ?? json);
      setState("done");
    } catch {
      setImportError("Network error. Please try again.");
      setState("preview");
    }
  }

  const previewRows = parsed?.rows.slice(0, 5) ?? [];
  const previewHeaders = parsed?.headers ?? [];

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Upload a CSV file to import records in bulk.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Instructions */}
          {instructions && instructions.length > 0 && (
            <div className="rounded-md bg-muted p-3">
              <p className="text-sm font-medium mb-1">Instructions:</p>
              <ul className="text-sm text-muted-foreground space-y-0.5 list-disc list-inside">
                {instructions.map((inst, i) => (
                  <li key={i}>{inst}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Template download */}
          <div className="flex items-center gap-3 p-3 rounded-md border border-dashed">
            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">Download Template</p>
              <p className="text-xs text-muted-foreground">
                Columns: {templateHeaders.join(", ")}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => downloadTemplateCsv(templateHeaders, templateFilename)}
            >
              Download
            </Button>
          </div>

          {/* File input */}
          {state !== "done" && (
            <div>
              <label className="block text-sm font-medium mb-1.5">Select CSV File</label>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-muted file:text-foreground hover:file:bg-muted/80 cursor-pointer"
                />
                {state !== "idle" && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={reset}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              {fileName && (
                <p className="text-xs text-muted-foreground mt-1">{fileName}</p>
              )}
            </div>
          )}

          {/* Error */}
          {importError && (
            <div className="flex items-start gap-2 rounded-md bg-destructive/10 text-destructive p-3 text-sm">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{importError}</span>
            </div>
          )}

          {/* Preview */}
          {(state === "preview" || state === "importing") && parsed && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium">
                  Preview — {parsed.rows.length} row{parsed.rows.length !== 1 ? "s" : ""} found
                  {parsed.rows.length > 5 && " (showing first 5)"}
                </p>
              </div>

              {previewHeaders.length > 0 ? (
                <div className="rounded-md border overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 border-b">
                      <tr>
                        {previewHeaders.map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground whitespace-nowrap">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {previewRows.map((row, i) => (
                        <tr key={i} className="hover:bg-muted/20">
                          {previewHeaders.map((h) => (
                            <td key={h} className="px-3 py-2 whitespace-nowrap max-w-[200px] truncate">
                              {row[h] || <span className="text-muted-foreground italic">empty</span>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No data found in file.</p>
              )}

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={reset} disabled={state === "importing"}>
                  Cancel
                </Button>
                <Button
                  onClick={handleImport}
                  disabled={parsed.rows.length === 0 || state === "importing"}
                >
                  {state === "importing" ? (
                    <span className="flex items-center gap-2">
                      <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <span className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Import {parsed.rows.length} Row{parsed.rows.length !== 1 ? "s" : ""}
                    </span>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Done */}
          {state === "done" && result && (
            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-md bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-900 p-4">
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800 dark:text-green-400">Import Complete</p>
                  <p className="text-sm text-green-700 dark:text-green-500 mt-0.5">
                    {result.imported} record{result.imported !== 1 ? "s" : ""} imported
                    {result.skipped > 0 && `, ${result.skipped} skipped`}
                  </p>
                </div>
              </div>

              {result.errors && result.errors.length > 0 && (
                <div className="rounded-md bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3">
                  <p className="text-sm font-medium text-amber-800 dark:text-amber-400 mb-1">
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}:
                  </p>
                  <ul className="text-xs text-amber-700 dark:text-amber-500 space-y-0.5 list-disc list-inside max-h-32 overflow-y-auto">
                    {result.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex items-center gap-2 justify-end">
                <Button variant="outline" onClick={reset}>
                  Import More
                </Button>
                <Button onClick={() => { reset(); onSuccess(); }}>
                  Done
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
