import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import {
  formatDateInAppTz,
  formatDateTimeInAppTz,
  getZonedDateParts,
  todayCalendarDate,
  DEFAULT_APP_TIMEZONE,
} from "@/lib/timezone";
import { normalizePhoneE164, sendSwalaSms } from "@/lib/sms/swala";

export const FINANCE_SMS_ALERT = {
  DEPOSIT: "DEPOSIT",
  EOD_SPEND: "EOD_SPEND",
} as const;

export const FINANCE_SMS_SOURCE = {
  CASHBOOK_RECEIPT: "CASHBOOK_RECEIPT",
  BANK_DEPOSIT: "BANK_DEPOSIT",
  EOD_SPEND: "EOD_SPEND",
} as const;

export const GLOBAL_SCOPE = "global";

export type DepositSourceType =
  | typeof FINANCE_SMS_SOURCE.CASHBOOK_RECEIPT
  | typeof FINANCE_SMS_SOURCE.BANK_DEPOSIT;

export type SmsRecipientInput = {
  phone: string;
  label?: string | null;
  isActive?: boolean;
};

function formatTzs(amount: number): string {
  return new Intl.NumberFormat("en-TZ", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(amount));
}

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

export async function getOrCreateSetting(scopeKey: string, alertType: string) {
  return db.financeNotificationSetting.upsert({
    where: { scopeKey_alertType: { scopeKey, alertType } },
    create: {
      scopeKey,
      alertType,
      enabled: false,
      skipIfZero: true,
    },
    update: {},
    include: {
      recipients: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function getFinanceSmsSettings(companyId: string) {
  const [deposit, eod] = await Promise.all([
    getOrCreateSetting(companyId, FINANCE_SMS_ALERT.DEPOSIT),
    getOrCreateSetting(GLOBAL_SCOPE, FINANCE_SMS_ALERT.EOD_SPEND),
  ]);
  return { deposit, eod };
}

export async function updateFinanceSmsSetting(params: {
  scopeKey: string;
  alertType: string;
  enabled?: boolean;
  skipIfZero?: boolean;
  recipients?: SmsRecipientInput[];
  updatedById: string;
  userName: string;
  companyId?: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const {
    scopeKey,
    alertType,
    enabled,
    skipIfZero,
    recipients,
    updatedById,
    userName,
    companyId,
    ipAddress,
    userAgent,
  } = params;

  const setting = await db.$transaction(async (tx) => {
    const upserted = await tx.financeNotificationSetting.upsert({
      where: { scopeKey_alertType: { scopeKey, alertType } },
      create: {
        scopeKey,
        alertType,
        enabled: enabled ?? false,
        skipIfZero: skipIfZero ?? true,
        updatedById,
      },
      update: {
        ...(enabled !== undefined ? { enabled } : {}),
        ...(skipIfZero !== undefined ? { skipIfZero } : {}),
        updatedById,
      },
    });

    if (recipients) {
      await tx.financeSmsRecipient.deleteMany({ where: { settingId: upserted.id } });
      const cleaned = recipients
        .map((r, i) => {
          const phone = normalizePhoneE164(r.phone) ?? r.phone.trim();
          return {
            settingId: upserted.id,
            phone,
            label: r.label?.trim() || null,
            isActive: r.isActive !== false,
            sortOrder: i,
          };
        })
        .filter((r) => r.phone.length > 0);

      if (cleaned.length) {
        await tx.financeSmsRecipient.createMany({ data: cleaned });
      }
    }

    return tx.financeNotificationSetting.findUniqueOrThrow({
      where: { id: upserted.id },
      include: {
        recipients: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
      },
    });
  });

  await createAuditLog({
    userId: updatedById,
    userName,
    action: "FINANCE_SMS_SETTING_UPDATE",
    module: "finance",
    resource: "finance_sms",
    recordId: setting.id,
    newValue: {
      scopeKey,
      alertType,
      enabled: setting.enabled,
      skipIfZero: setting.skipIfZero,
      recipientCount: setting.recipients.length,
    },
    description: `Updated finance SMS ${alertType} settings (${scopeKey})`,
    ipAddress,
    userAgent,
    companyId,
  });

  return setting;
}

async function alreadySent(idempotencyKey: string): Promise<boolean> {
  const existing = await db.financeSmsLog.findUnique({ where: { idempotencyKey } });
  return Boolean(existing && existing.status === "SENT");
}

async function recordLog(params: {
  alertType: string;
  sourceType: string;
  sourceId: string;
  companyId?: string | null;
  phone: string;
  body: string;
  status: "SENT" | "FAILED" | "SKIPPED";
  providerMsgId?: string | null;
  errorMessage?: string | null;
  idempotencyKey: string;
}) {
  try {
    return await db.financeSmsLog.create({
      data: {
        alertType: params.alertType,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        companyId: params.companyId ?? null,
        phone: params.phone,
        body: params.body,
        status: params.status,
        providerMsgId: params.providerMsgId ?? null,
        errorMessage: params.errorMessage ?? null,
        idempotencyKey: params.idempotencyKey,
      },
    });
  } catch (err) {
    // Unique idempotency race — treat as already logged
    const existing = await db.financeSmsLog.findUnique({
      where: { idempotencyKey: params.idempotencyKey },
    });
    if (existing) return existing;
    throw err;
  }
}

/**
 * Fire deposit SMS after a money-in event.
 * Wired from: CashbookEntry RECEIPT and BankTransaction DEPOSIT.
 * Failures are logged and never throw to the caller.
 */
export async function notifyDepositPosted(params: {
  companyId: string;
  sourceType: DepositSourceType;
  sourceId: string;
  amount: number;
  accountName: string;
  accountCode?: string | null;
  reference?: string | null;
  occurredAt: Date;
}): Promise<void> {
  try {
    const company = await db.company.findUnique({
      where: { id: params.companyId },
      select: { id: true, name: true },
    });
    if (!company) return;

    const setting = await getOrCreateSetting(params.companyId, FINANCE_SMS_ALERT.DEPOSIT);
    if (!setting.enabled) return;

    const recipients = setting.recipients.filter((r) => r.isActive);
    if (!recipients.length) return;

    const accountLabel = params.accountCode
      ? `${params.accountName} (${params.accountCode})`
      : params.accountName;
    const when = formatDateTimeInAppTz(params.occurredAt);
    const ref = params.reference?.trim() || params.sourceId.slice(0, 8);
    const body =
      `IMS Deposit\n` +
      `${company.name}\n` +
      `${accountLabel}\n` +
      `TZS ${formatTzs(params.amount)}\n` +
      `${when} EAT\n` +
      `Ref: ${ref}`;

    for (const recipient of recipients) {
      const phone = normalizePhoneE164(recipient.phone) ?? recipient.phone;
      const idempotencyKey = `deposit:${params.sourceType}:${params.sourceId}:${phone}`;
      if (await alreadySent(idempotencyKey)) continue;

      const result = await sendSwalaSms({
        to: phone,
        body,
        idempotencyKey,
      });

      await recordLog({
        alertType: FINANCE_SMS_ALERT.DEPOSIT,
        sourceType: params.sourceType,
        sourceId: params.sourceId,
        companyId: params.companyId,
        phone,
        body,
        status: result.ok ? "SENT" : "FAILED",
        providerMsgId: result.ok ? result.providerMsgId : null,
        errorMessage: result.ok ? null : result.error,
        idempotencyKey,
      });

      await createAuditLog({
        userName: "system",
        action: result.ok ? "FINANCE_SMS_SENT" : "FINANCE_SMS_FAILED",
        module: "finance",
        resource: "finance_sms",
        recordId: params.sourceId,
        newValue: {
          alertType: FINANCE_SMS_ALERT.DEPOSIT,
          phone,
          providerMsgId: result.ok ? result.providerMsgId : undefined,
          error: result.ok ? undefined : result.error,
        },
        description: result.ok
          ? `Deposit SMS sent to ${phone}`
          : `Deposit SMS failed for ${phone}: ${result.error}`,
        companyId: params.companyId,
      });
    }
  } catch (err) {
    console.error("[finance-sms] notifyDepositPosted error", err);
  }
}

export type EodCompanySpend = {
  companyId: string;
  companyName: string;
  spend: number;
};

export async function computeEodSpendByCompany(calendarDate: string): Promise<EodCompanySpend[]> {
  const { start, end } = eatDayBounds(calendarDate);
  const companies = await db.company.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const results: EodCompanySpend[] = [];

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

function buildEodBody(calendarDate: string, lines: EodCompanySpend[], grandTotal: number): string {
  const dateLabel = formatDateInAppTz(calendarDate);
  const parts = [
    `IMS EOD Spend`,
    dateLabel,
    ...lines.map((l) => `${l.companyName}: TZS ${formatTzs(l.spend)}`),
    `Total: TZS ${formatTzs(grandTotal)}`,
  ];
  return parts.join("\n").slice(0, 1600);
}

/**
 * Send one combined all-companies EOD spend SMS to the global director list.
 * Idempotent per calendar day + phone.
 */
export async function runEodSpendSms(options?: {
  calendarDate?: string;
  force?: boolean;
}): Promise<{
  calendarDate: string;
  skipped: boolean;
  reason?: string;
  grandTotal: number;
  sent: number;
  failed: number;
}> {
  const calendarDate = options?.calendarDate ?? todayCalendarDate();
  const setting = await getOrCreateSetting(GLOBAL_SCOPE, FINANCE_SMS_ALERT.EOD_SPEND);

  if (!setting.enabled && !options?.force) {
    return { calendarDate, skipped: true, reason: "EOD SMS disabled", grandTotal: 0, sent: 0, failed: 0 };
  }

  const lines = await computeEodSpendByCompany(calendarDate);
  const grandTotal = lines.reduce((sum, l) => sum + l.spend, 0);

  if (setting.skipIfZero && grandTotal <= 0 && !options?.force) {
    const idempotencyKey = `eod:${calendarDate}:skip-zero`;
    if (!(await alreadySent(idempotencyKey))) {
      await recordLog({
        alertType: FINANCE_SMS_ALERT.EOD_SPEND,
        sourceType: FINANCE_SMS_SOURCE.EOD_SPEND,
        sourceId: calendarDate,
        phone: "-",
        body: `Skipped EOD SMS (zero spend) ${calendarDate}`,
        status: "SKIPPED",
        idempotencyKey,
      });
    }
    return { calendarDate, skipped: true, reason: "zero spend", grandTotal, sent: 0, failed: 0 };
  }

  const recipients = setting.recipients.filter((r) => r.isActive);
  if (!recipients.length) {
    return { calendarDate, skipped: true, reason: "no recipients", grandTotal, sent: 0, failed: 0 };
  }

  const body = buildEodBody(calendarDate, lines, grandTotal);
  let sent = 0;
  let failed = 0;

  for (const recipient of recipients) {
    const phone = normalizePhoneE164(recipient.phone) ?? recipient.phone;
    const idempotencyKey = `eod:${calendarDate}:${phone}`;
    if (await alreadySent(idempotencyKey)) continue;

    const result = await sendSwalaSms({ to: phone, body, idempotencyKey });
    await recordLog({
      alertType: FINANCE_SMS_ALERT.EOD_SPEND,
      sourceType: FINANCE_SMS_SOURCE.EOD_SPEND,
      sourceId: calendarDate,
      phone,
      body,
      status: result.ok ? "SENT" : "FAILED",
      providerMsgId: result.ok ? result.providerMsgId : null,
      errorMessage: result.ok ? null : result.error,
      idempotencyKey,
    });

    await createAuditLog({
      userName: "system",
      action: result.ok ? "FINANCE_SMS_SENT" : "FINANCE_SMS_FAILED",
      module: "finance",
      resource: "finance_sms",
      recordId: calendarDate,
      newValue: {
        alertType: FINANCE_SMS_ALERT.EOD_SPEND,
        phone,
        grandTotal,
        providerMsgId: result.ok ? result.providerMsgId : undefined,
        error: result.ok ? undefined : result.error,
      },
      description: result.ok
        ? `EOD spend SMS sent to ${phone} (TZS ${formatTzs(grandTotal)})`
        : `EOD spend SMS failed for ${phone}: ${result.error}`,
    });

    if (result.ok) sent += 1;
    else failed += 1;
  }

  return { calendarDate, skipped: false, grandTotal, sent, failed };
}

export async function listFinanceSmsLogs(params: {
  alertType?: string;
  companyId?: string;
  page?: number;
  pageSize?: number;
}) {
  const page = params.page ?? 1;
  const pageSize = Math.min(params.pageSize ?? 50, 100);
  const where: Record<string, unknown> = {};
  if (params.alertType) where.alertType = params.alertType;
  if (params.companyId) where.companyId = params.companyId;

  const [logs, total] = await Promise.all([
    db.financeSmsLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.financeSmsLog.count({ where }),
  ]);

  return { logs, total, page, pageSize };
}

/** True when current EAT hour is within the configured EOD window (default 18–20). */
export function isWithinEodWindow(now: Date = new Date()): boolean {
  const hour = Number(getZonedDateParts(now, DEFAULT_APP_TIMEZONE).hour);
  const start = Number(process.env.FINANCE_EOD_SMS_HOUR_START ?? "18");
  const end = Number(process.env.FINANCE_EOD_SMS_HOUR_END ?? "20");
  return hour >= start && hour <= end;
}
