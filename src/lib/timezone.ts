/**
 * App timezone helpers.
 *
 * Company Settings default is Africa/Dar_es_Salaam (EAT, UTC+3). Server runtimes
 * (Vercel/Node) are usually UTC, so Date#getFullYear/getMonth/getDate and
 * date-fns format() without a zone skew calendar dates overnight (e.g. WO-20260916
 * while local EAT is already 17 Sep). Prefer this module for display + doc stamps.
 */

export const DEFAULT_APP_TIMEZONE = "Africa/Dar_es_Salaam";

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

/** Matches prior date-fns pattern: dd MMM yyyy (e.g. 17 Sep 2026). */
export function formatDateInAppTz(
  date: Date | string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const { year, month, day } = getZonedDateParts(new Date(date), timeZone);
  const monthName = SHORT_MONTHS[Number(month) - 1] ?? month;
  return `${day} ${monthName} ${year}`;
}

export function formatDateTimeInAppTz(
  date: Date | string,
  timeZone: string = DEFAULT_APP_TIMEZONE
): string {
  const d = new Date(date);
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
