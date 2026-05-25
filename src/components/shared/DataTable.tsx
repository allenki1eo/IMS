"use client";
import React, { useState } from "react";
import { ChevronLeft, ChevronRight, ChevronsUpDown, ChevronUp, ChevronDown, MoreHorizontal, Download, FileSpreadsheet, FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
function getCellValue<T extends object>(col: { key: string; exportValue?: (row: T) => string | number }, row: T): string {
  if (col.exportValue) return String(col.exportValue(row));
  const val = (row as any)[col.key];
  if (val === null || val === undefined) return "";
  if (typeof val === "object") return "";
  return String(val);
}

function exportCsv<T extends object>(columns: { key: string; header: string; exportValue?: (row: T) => string | number }[], data: T[], filename: string) {
  const headers = columns.map((c) => JSON.stringify(c.header)).join(",");
  const rows = data.map((row) =>
    columns.map((c) => JSON.stringify(getCellValue(c, row))).join(",")
  );
  const csv = [headers, ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${filename}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportExcel<T extends object>(columns: { key: string; header: string; exportValue?: (row: T) => string | number }[], data: T[], filename: string) {
  const XLSX = await import("xlsx");
  const headers = columns.map((c) => c.header);
  const rows = data.map((row) => columns.map((c) => getCellValue(c, row)));
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

async function exportPdf<T extends object>(columns: { key: string; header: string; exportValue?: (row: T) => string | number }[], data: T[], filename: string) {
  const jsPDF = (await import("jspdf")).default;
  const autoTable = (await import("jspdf-autotable")).default;
  const doc = new jsPDF({ orientation: "landscape" });
  const title = filename.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const date = new Date().toLocaleDateString("en-GB");

  doc.setFontSize(14);
  doc.text(title, 14, 15);
  doc.setFontSize(9);
  doc.setTextColor(120);
  doc.text(`Generated: ${date}`, 14, 21);

  const head = [columns.map((c) => c.header)];
  const body = data.map((row) => columns.map((c) => getCellValue(c, row)));

  autoTable(doc, {
    head,
    body,
    startY: 26,
    styles: { fontSize: 8 },
    headStyles: { fillColor: [40, 40, 40] },
  });

  doc.save(`${filename}.pdf`);
}

export interface RowAction<T> {
  label: string;
  onClick: (row: T) => void;
  variant?: "default" | "destructive";
  hidden?: (row: T) => boolean;
}

interface Column<T> {
  key: string;
  header: string;
  cell?: (row: T) => React.ReactNode;
  exportValue?: (row: T) => string | number;
  className?: string;
  sortable?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  page?: number;
  pageSize?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  className?: string;
  selectable?: boolean;
  rowActions?: RowAction<T>[];
  onSelectionChange?: (ids: string[]) => void;
  exportable?: boolean;
  exportFilename?: string;
  importable?: boolean;
  onImport?: () => void;
  mobileCardRender?: (row: T) => React.ReactNode;
}

type SortDir = "asc" | "desc" | null;

export function DataTable<T extends { id: string }>({
  columns,
  data,
  loading,
  emptyTitle,
  emptyDescription,
  page = 1,
  pageSize = 20,
  total = 0,
  onPageChange,
  className,
  selectable,
  rowActions,
  onSelectionChange,
  exportable,
  exportFilename = "export",
  importable,
  onImport,
  mobileCardRender,
}: DataTableProps<T>) {
  const totalPages = Math.ceil(total / pageSize);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>(null);

  const toggleAll = () => {
    if (selected.size === data.length) {
      const next = new Set<string>();
      setSelected(next);
      onSelectionChange?.([]);
    } else {
      const next = new Set(data.map((r) => r.id));
      setSelected(next);
      onSelectionChange?.(Array.from(next));
    }
  };

  const toggleRow = (id: string) => {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
    onSelectionChange?.(Array.from(next));
  };

  const handleSort = (key: string) => {
    if (sortKey !== key) {
      setSortKey(key);
      setSortDir("asc");
    } else if (sortDir === "asc") {
      setSortDir("desc");
    } else {
      setSortKey(null);
      setSortDir(null);
    }
  };

  const sortedData = React.useMemo(() => {
    if (!sortKey || !sortDir) return data;
    return [...data].sort((a, b) => {
      const av = (a as any)[sortKey] ?? "";
      const bv = (b as any)[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [data, sortKey, sortDir]);

  const allCols = [
    ...(selectable ? [{ key: "__select", header: "", className: "w-10" }] : []),
    ...columns,
    ...(rowActions?.length ? [{ key: "__actions", header: "", className: "w-10" }] : []),
  ];

  const hasActions = rowActions && rowActions.length > 0;

  // Export columns exclude action-type columns (no key cell rendering needed)
  const exportCols = columns.filter((c) => c.key !== "actions");

  return (
    <div className={cn("space-y-3", className)}>
      {/* Mobile card view */}
      {mobileCardRender && !loading && sortedData.length > 0 && (
        <div className="sm:hidden space-y-2">
          {sortedData.map((row) => (
            <div key={row.id} className={cn("rounded-lg border bg-card p-4", selected.has(row.id) && "border-foreground/20 bg-muted/20")}>
              {selectable && (
                <div className="mb-3">
                  <Checkbox checked={selected.has(row.id)} onCheckedChange={() => toggleRow(row.id)} />
                </div>
              )}
              {mobileCardRender(row)}
              {hasActions && (
                <div className="mt-3 pt-3 border-t flex justify-end">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                        Actions <MoreHorizontal className="h-3 w-3" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {rowActions!.filter((a) => !a.hidden?.(row)).map((action) => (
                        <DropdownMenuItem key={action.label} onClick={() => action.onClick(row)} className={cn(action.variant === "destructive" && "text-destructive focus:text-destructive")}>
                          {action.label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Desktop table */}
      <div className={cn("rounded-lg border overflow-hidden", mobileCardRender && "hidden sm:block")}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                {selectable && (
                  <th className="w-10 px-4 py-3">
                    <Checkbox
                      checked={data.length > 0 && selected.size === data.length}
                      onCheckedChange={toggleAll}
                      aria-label="Select all"
                    />
                  </th>
                )}
                {columns.map((col) => (
                  <th
                    key={col.key}
                    className={cn(
                      "px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground whitespace-nowrap",
                      col.sortable && "cursor-pointer select-none hover:text-foreground transition-colors",
                      col.className
                    )}
                    onClick={col.sortable ? () => handleSort(col.key) : undefined}
                  >
                    <span className="flex items-center gap-1">
                      {col.header}
                      {col.sortable && (
                        <span className="text-muted-foreground/50">
                          {sortKey === col.key && sortDir === "asc" ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : sortKey === col.key && sortDir === "desc" ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronsUpDown className="h-3 w-3" />
                          )}
                        </span>
                      )}
                    </span>
                  </th>
                ))}
                {hasActions && <th className="w-10 px-4 py-3" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {allCols.map((col) => (
                      <td key={col.key} className="px-4 py-3">
                        <Skeleton className="h-4 w-full" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : sortedData.length === 0 ? (
                <tr>
                  <td colSpan={allCols.length}>
                    <EmptyState title={emptyTitle} description={emptyDescription} />
                  </td>
                </tr>
              ) : (
                sortedData.map((row) => (
                  <tr
                    key={row.id}
                    className={cn(
                      "hover:bg-muted/30 transition-colors",
                      selected.has(row.id) && "bg-muted/20"
                    )}
                  >
                    {selectable && (
                      <td className="w-10 px-4 py-3">
                        <Checkbox
                          checked={selected.has(row.id)}
                          onCheckedChange={() => toggleRow(row.id)}
                          aria-label="Select row"
                        />
                      </td>
                    )}
                    {columns.map((col) => (
                      <td key={col.key} className={cn("px-4 py-3", col.className)}>
                        {col.cell ? col.cell(row) : (row as any)[col.key] ?? "-"}
                      </td>
                    ))}
                    {hasActions && (
                      <td className="w-10 px-4 py-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {rowActions!
                              .filter((a) => !a.hidden?.(row))
                              .map((action) => (
                                <DropdownMenuItem
                                  key={action.label}
                                  onClick={() => action.onClick(row)}
                                  className={cn(
                                    action.variant === "destructive" && "text-destructive focus:text-destructive"
                                  )}
                                >
                                  {action.label}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination + export */}
      {(total > pageSize || exportable || importable) && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center gap-3">
            {total > 0 && (
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, total)}–{Math.min(page * pageSize, total)} of {total}
                {selected.size > 0 && (
                  <span className="ml-2 text-foreground font-medium">{selected.size} selected</span>
                )}
              </span>
            )}
            {exportable && data.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs">
                    <Download className="h-3 w-3" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => exportCsv(exportCols, data, exportFilename)}>
                    <Download className="h-3.5 w-3.5 mr-2" />
                    Export CSV
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportExcel(exportCols, data, exportFilename)}>
                    <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />
                    Export Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportPdf(exportCols, data, exportFilename)}>
                    <FileText className="h-3.5 w-3.5 mr-2" />
                    Export PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {importable && onImport && (
              <Button
                variant="outline"
                size="sm"
                className="h-7 gap-1.5 text-xs"
                onClick={onImport}
              >
                <Upload className="h-3 w-3" />
                Import CSV
              </Button>
            )}
          </div>
          {total > pageSize && (
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="px-2 text-xs">Page {page} of {totalPages}</span>
              <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= totalPages} onClick={() => onPageChange?.(page + 1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
