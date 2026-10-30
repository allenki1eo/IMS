/**
 * Data Center constants and period maths. Pure — safe to import from client
 * components (no db imports).
 */

export const DATA_CATEGORIES = [
  { value: "BUDGET", label: "Budget" },
  { value: "TARGETS", label: "Targets & KPIs" },
  { value: "STATUTORY", label: "Statutory return" },
  { value: "LICENCE", label: "Licence / permit" },
  { value: "PRICE_LIST", label: "Price list" },
  { value: "MASTER_DATA", label: "Master data" },
  { value: "REPORT", label: "Report" },
  { value: "OTHER", label: "Other" },
] as const;

export type DataCategory = (typeof DATA_CATEGORIES)[number]["value"];

export const FREQUENCIES = [
  { value: "ANNUAL", label: "Annual" },
  { value: "QUARTERLY", label: "Quarterly" },
  { value: "MONTHLY", label: "Monthly" },
] as const;

export type Frequency = (typeof FREQUENCIES)[number]["value"];

export type PeriodStatus = "SUBMITTED" | "OVERDUE" | "DUE_SOON" | "UPCOMING";

export const DUE_SOON_DAYS = 14;

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function categoryLabel(value: string) {
  return DATA_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function frequencyLabel(value: string) {
  return FREQUENCIES.find((f) => f.value === value)?.label ?? value;
}

export function isCategory(v: string): v is DataCategory {
  return DATA_CATEGORIES.some((c) => c.value === v);
}

export function isFrequency(v: string): v is Frequency {
  return FREQUENCIES.some((f) => f.value === v);
}

/** Period keys a requirement expects in a year: "2026" | "2026-Q1"… | "2026-01"… */
export function periodsFor(frequency: string, year: number): string[] {
  if (frequency === "QUARTERLY") return [1, 2, 3, 4].map((q) => `${year}-Q${q}`);
  if (frequency === "MONTHLY") return MONTHS.map((_, i) => `${year}-${String(i + 1).padStart(2, "0")}`);
  return [String(year)];
}

/** Validates a key and returns its year, or null. */
export function parsePeriodKey(key: string): { year: number; quarter?: number; month?: number } | null {
  const m = /^(\d{4})(?:-Q([1-4])|-(0[1-9]|1[0-2]))?$/.exec(key);
  if (!m) return null;
  return { year: Number(m[1]), quarter: m[2] ? Number(m[2]) : undefined, month: m[3] ? Number(m[3]) : undefined };
}

export function periodLabel(key: string): string {
  const p = parsePeriodKey(key);
  if (!p) return key;
  if (p.quarter) return `Q${p.quarter} ${p.year}`;
  if (p.month) return `${MONTHS[p.month - 1]} ${p.year}`;
  return `FY ${p.year}`;
}

/** Short label for compact period chips: "FY", "Q1", "Jan". */
export function periodShortLabel(key: string): string {
  const p = parsePeriodKey(key);
  if (!p) return key;
  if (p.quarter) return `Q${p.quarter}`;
  if (p.month) return MONTHS[p.month - 1];
  return `FY ${p.year}`;
}

function clampedDate(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  return new Date(year, monthIndex, Math.min(Math.max(day, 1), last), 23, 59, 59);
}

/**
 * When a period's file is due.
 * - ANNUAL: dueMonth/dueDay of the period year (e.g. budget for 2026 due 31 Jan 2026).
 * - QUARTERLY / MONTHLY: dueDay of the month after the period ends.
 */
export function dueDateFor(req: { frequency: string; dueMonth: number; dueDay: number }, key: string): Date {
  const p = parsePeriodKey(key);
  if (!p) return new Date(NaN);
  if (p.quarter) return clampedDate(p.year, p.quarter * 3, req.dueDay); // month index after quarter end
  if (p.month) return clampedDate(p.year, p.month, req.dueDay);
  return clampedDate(p.year, req.dueMonth - 1, req.dueDay);
}

export function periodStatus(submitted: boolean, due: Date, now = new Date()): PeriodStatus {
  if (submitted) return "SUBMITTED";
  if (due < now) return "OVERDUE";
  if (due.getTime() - now.getTime() <= DUE_SOON_DAYS * 86_400_000) return "DUE_SOON";
  return "UPCOMING";
}

/** File types people actually exchange as "data": sheets, documents, scans. */
export const ALLOWED_EXTENSIONS = [
  ".xlsx", ".xls", ".csv", ".pdf", ".docx", ".doc", ".pptx", ".txt", ".json", ".zip", ".png", ".jpg", ".jpeg",
];

export function extensionOf(name: string) {
  const i = name.lastIndexOf(".");
  return i === -1 ? "" : name.slice(i).toLowerCase();
}

export function formatBytes(n: number) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}
