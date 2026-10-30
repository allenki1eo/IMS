/**
 * Declarative report model.
 *
 * A report is a list of blocks. The same spec renders as an A4 paper document
 * (screen + print) and exports to a structured Excel workbook, so the two can
 * never disagree.
 */
import type { ReactNode } from "react";

export type CellValue = string | number | null | undefined;
export type ValueFormat = "text" | "number" | "money" | "date" | "code";

export interface ReportColumn<T = any> {
  header: string;
  value: (row: T) => CellValue;
  format?: ValueFormat;
  /** Sum this column into the table's totals row. */
  total?: boolean;
  /** Fixed width hint, e.g. "18%". */
  width?: string;
}

export interface TableBlock<T = any> {
  kind: "table";
  title: string;
  description?: string;
  columns: ReportColumn<T>[];
  rows: T[];
  emptyText?: string;
  /** Prepend a "#" row-number column (default true). */
  numbered?: boolean;
}

export interface KeyFiguresBlock {
  kind: "keyFigures";
  title: string;
  items: { label: string; value: CellValue; format?: ValueFormat }[];
}

export interface StatementLine {
  code?: string;
  label: string;
  amount: number;
}

/** Financial-statement layout: grouped lines with subtotals and a result line. */
export interface StatementBlock {
  kind: "statement";
  title: string;
  description?: string;
  groups: { heading: string; lines: StatementLine[]; totalLabel: string; total: number; emptyText?: string }[];
  result?: { label: string; amount: number; tone?: "positive" | "negative" | "neutral" };
}

export interface FigureBlock {
  kind: "figure";
  title: string;
  caption?: string;
  node: ReactNode;
}

export interface NoteBlock {
  kind: "note";
  title: string;
  text: string;
  tone?: "info" | "warning" | "success" | "destructive";
}

export type ReportBlock = TableBlock | KeyFiguresBlock | StatementBlock | FigureBlock | NoteBlock;

export interface ReportMeta {
  title: string;
  subtitle?: string;
  /** Short code for the document number, e.g. "WH" → RPT-WH-20261030-0752. */
  code: string;
  /** Human period, e.g. "1 Jan 2026 – 30 Oct 2026" or "As at 30 Oct 2026". */
  period: string;
  /** Extra filter lines shown in the title block, e.g. ["Line family: Spirits"]. */
  filters?: string[];
  currency?: string;
}

/* ─────────────── Helpers ─────────────── */

/** Type-safe table builder; erases the row type for the block list. */
export function table<T>(block: Omit<TableBlock<T>, "kind">): TableBlock {
  return { kind: "table", ...block } as TableBlock;
}

const MONEY = new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const NUMBER = new Intl.NumberFormat("en-US", { maximumFractionDigits: 3 });

export function formatCell(value: CellValue, format: ValueFormat = "text"): string {
  if (value === null || value === undefined || value === "") return "—";
  switch (format) {
    case "money":
      return typeof value === "number" ? MONEY.format(value) : String(value);
    case "number":
      return typeof value === "number" ? NUMBER.format(value) : String(value);
    case "date": {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? String(value) : formatPaperDate(d);
    }
    default:
      return String(value);
  }
}

export function formatMoney(value: number) {
  return MONEY.format(value);
}

/** 30 Oct 2026 — unambiguous on paper regardless of locale. */
export function formatPaperDate(d: Date | string) {
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export function formatPeriod(from?: string, to?: string) {
  if (from && to) return `${formatPaperDate(from)} – ${formatPaperDate(to)}`;
  if (from) return `From ${formatPaperDate(from)}`;
  if (to) return `Up to ${formatPaperDate(to)}`;
  return "All dates";
}

export function isNumericFormat(format?: ValueFormat) {
  return format === "money" || format === "number";
}

export function columnTotal<T>(col: ReportColumn<T>, rows: T[]) {
  return rows.reduce((sum, r) => {
    const v = col.value(r);
    return sum + (typeof v === "number" && Number.isFinite(v) ? v : 0);
  }, 0);
}

/** RPT-WH-20261030-0752 */
export function documentNumber(code: string, at: Date) {
  const p = (n: number) => String(n).padStart(2, "0");
  return `RPT-${code}-${at.getFullYear()}${p(at.getMonth() + 1)}${p(at.getDate())}-${p(at.getHours())}${p(at.getMinutes())}`;
}
