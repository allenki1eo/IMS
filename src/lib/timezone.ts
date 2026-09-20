/**
 * App timezone helpers.
 *
 * Company Settings default is Africa/Dar_es_Salaam (EAT, UTC+3). Server runtimes
 * (Vercel/Node) are usually UTC, so Date#getFullYear/getMonth/getDate,
 * Date#toISOString().split("T")[0], and date-fns format() without a zone skew
 * calendar dates overnight (e.g. DO-20260920 while local EAT is already 20 Sep,
 * but UTC "today" / display still shows 19 Sep). Prefer this module for
 * display, form defaults, date-only parse, and doc stamps.
 */

export const DEFAULT_APP_TIMEZONE = "Africa/Dar_es_Salaam";

/** YYYY-MM-DD (no time / no zone). */
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export type ZonedDateParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
};

export function getZonedDateParts(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): ZonedDateParts {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const map: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") map[part.type] = part.value;
  }

  return {
    year: map.year ?? "0000",
    month: map.month ?? "01",
    day: map.day ?? "01",
    hour: map.hour ?? "00",
    minute: map.minute ?? "00",
  };
}

/** True when value is a calendar date string (YYYY-MM-DD). */
export function isDateOnlyString(value: unknown): value is string {
  return typeof value === "string" && DATE_ONLY_RE.test(value.trim());
}

/**
 * Calendar date YYYY-MM-DD in the app timezone.
 * Use for <input type="date"> defaults — never Date#toISOString().split("T")[0]
 * (that is UTC and off-by-one before 03:00 EAT).
 */
export function todayCalendarDate(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}-${month}-${day}`;
}

/**
 * Parse a date-only form value as that calendar day (stable across zones).
 * Stored as UTC noon so zoned formatters keep the same YYYY-MM-DD in EAT and
 * nearby offsets.
 */
export function parseDateOnly(value: string): Date {
  const m = DATE_ONLY_RE.exec(value.trim());
  if (!m) throw new Error("Invalid date-only value (expected YYYY-MM-DD)");
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
}

/**
 * Coerce form / API date input: date-only → parseDateOnly; otherwise Date parse.
 * Returns null for empty.
 */
export function parseAppDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") return null;
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) throw new Error("Invalid date");
    return value;
  }
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  if (isDateOnlyString(trimmed)) return parseDateOnly(trimmed);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) throw new Error("Invalid date");
  return d;
}

/** YYYYMMDD in the app timezone — used in document / reference numbers. */
export function documentDateStamp(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const { year, month, day } = getZonedDateParts(date, timeZone);
  return `${year}${month}${day}`;
}

/** e.g. WO-20260917-4821 */
export function generateDatedRef(
  prefix: string,
  options?: { digits?: number; date?: Date; timeZone?: string }
): string {
  const digits = options?.digits ?? 4;
  const min = 10 ** (digits - 1);
  const span = 9 * min;
  const date = documentDateStamp(options?.date, options?.timeZone);
  const suffix = String(Math.floor(Math.random() * span) + min);
  return `${prefix}-${date}-${suffix}`;
}

const SHORT_MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
] as const;

function formatCalendarParts(year: string, month: string, day: string): string {
  const monthName = SHORT_MONTHS[Number(month) - 1] ?? month;
  return `${day} ${monthName} ${year}`;
}

/**
 * Matches prior date-fns pattern: dd MMM yyyy (e.g. 20 Sep 2026).
 * Date-only strings (YYYY-MM-DD) are formatted as that calendar day — no UTC shift.
 * Timestamps use Africa/Dar_es_Salaam so refs like DO-20260920 match the display day.
 */
export function formatDateInAppTz(
  date: Date | string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  if (typeof date === "string" && isDateOnlyString(date)) {
    const m = DATE_ONLY_RE.exec(date.trim())!;
    return formatCalendarParts(m[1], m[2], m[3]);
  }
  const d = date instanceof Date ? date : new Date(date);
  const { year, month, day } = getZonedDateParts(d, timeZone);
  return formatCalendarParts(year, month, day);
}

export function formatDateTimeInAppTz(
  date: Date | string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const d = typeof date === "string" && isDateOnlyString(date)
    ? parseDateOnly(date)
    : new Date(date);
  const datePart = formatDateInAppTz(d, timeZone);
  const { hour, minute } = getZonedDateParts(d, timeZone);
  return `${datePart} ${hour}:${minute}`;
}

/** Hour 0–23 in the app timezone (for greetings / “today” UI). */
export function getAppHour(
  date: Date = new Date(),
  timeZone: string = DEFAULT_APP_TIMEZONE
): number {
  return Number(getZonedDateParts(date, timeZone).hour);
}
