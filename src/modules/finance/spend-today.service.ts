/**
 * Shared "Spend today" metric — single source of truth for EOD SMS and dashboards.
 *
 * Definition (must match Finance EOD SMS):
 *   Sum of outflows for the EAT calendar day:
 *   - Cashbook PAYMENT amounts
 *   - Bank WITHDRAWAL amounts
 *   - Exclude TRANSFER (internal moves between own accounts)
 *
 * Empty window → TZS 0 (never blank / Unknown).
 */
import { db } from "@/lib/db";
import { todayCalendarDate } from "@/lib/timezone";

export type SpendTodayLine = {
  companyId: string;
  companyName: string;
  spend: number;
};

export type SpendTodayResult = {
  calendarDate: string;
  timezone: "Africa/Dar_es_Salaam";
  lines: SpendTodayLine[];
  /** All-companies total (Director). Always a number — 0 when empty. */
  total: number;
  /** Company slice when companyId was passed; else same as total. */
  companySpend: number;
};

/** Inclusive EAT calendar-day bounds as UTC Date objects for Prisma filters. */
export function eatDayBounds(calendarDate: string): { start: Date; end: Date } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(calendarDate.trim());
  if (!m) throw new Error("Invalid calendar date (expected YYYY-MM-DD)");
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  // EAT = UTC+3 → day start 00:00 EAT = previous day 21:00 UTC
  const start = new Date(Date.UTC(y, mo - 1, d, -3, 0, 0, 0));
  const end = new Date(Date.UTC(y, mo - 1, d + 1, -3, 0, 0, 0) - 1);
  return { start, end };
}

/**
 * Per-company spend for an EAT calendar day (same definition as EOD SMS).
 * Returns every active company, including those with spend 0.
 */
export async function computeSpendByCompany(
  calendarDate: string
): Promise<SpendTodayLine[]> {
  const { start, end } = eatDayBounds(calendarDate);
  const companies = await db.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: SpendTodayLine[] = [];

  for (const company of companies) {
    const [cashPayments, bankWithdrawals] = await Promise.all([
      db.cashbookEntry.aggregate({
        where: {
          companyId: company.id,
          type: "PAYMENT",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      db.bankTransaction.aggregate({
        where: {
          companyId: company.id,
          type: "WITHDRAWAL",
          transactionDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);

    const spend =
      (cashPayments._sum.amount ?? 0) + (bankWithdrawals._sum.amount ?? 0);

    results.push({
      companyId: company.id,
      companyName: company.name,
      spend,
    });
  }

  return results;
}

/** Cash / bank in for an EAT day (deposits). Excludes transfers. */
export async function computeCashInByCompany(
  calendarDate: string
): Promise<SpendTodayLine[]> {
  const { start, end } = eatDayBounds(calendarDate);
  const companies = await db.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: SpendTodayLine[] = [];
  for (const company of companies) {
    const [cashReceipts, bankDeposits] = await Promise.all([
      db.cashbookEntry.aggregate({
        where: {
          companyId: company.id,
          type: "RECEIPT",
          date: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
      db.bankTransaction.aggregate({
        where: {
          companyId: company.id,
          type: "DEPOSIT",
          transactionDate: { gte: start, lte: end },
        },
        _sum: { amount: true },
      }),
    ]);
    const spend =
      (cashReceipts._sum.amount ?? 0) + (bankDeposits._sum.amount ?? 0);
    results.push({
      companyId: company.id,
      companyName: company.name,
      spend,
    });
  }
  return results;
}

/**
 * Shared dashboard metric.
 * - companyId omitted → all-companies total (Director / EOD SMS rollup)
 * - companyId set → that company's slice (Ops)
 */
export async function getSpendToday(options?: {
  calendarDate?: string;
  companyId?: string | null;
}): Promise<SpendTodayResult> {
  const calendarDate = options?.calendarDate ?? todayCalendarDate();
  const lines = await computeSpendByCompany(calendarDate);
  const total = lines.reduce((sum, l) => sum + l.spend, 0);
  const companySpend = options?.companyId
    ? (lines.find((l) => l.companyId === options.companyId)?.spend ?? 0)
    : total;

  return {
    calendarDate,
    timezone: "Africa/Dar_es_Salaam",
    lines,
    total,
    companySpend,
  };
}

/** @deprecated Use SpendTodayLine — kept for EOD SMS call sites. */
export type EodCompanySpend = SpendTodayLine;

/** @deprecated Use computeSpendByCompany — alias so EOD SMS stays in sync. */
export const computeEodSpendByCompany = computeSpendByCompany;
