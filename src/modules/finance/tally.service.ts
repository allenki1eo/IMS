import { db } from "@/lib/db";
import bcrypt from "bcryptjs";
import crypto from "crypto";

// ─── API Key Management ────────────────────────────────────────────────────────

export async function generateApiKey(
  companyId: string,
  label: string,
  createdById: string
): Promise<{ plainKey: string; id: string }> {
  const plainKey = crypto.randomBytes(32).toString("hex");
  const keyHash = await bcrypt.hash(plainKey, 10);

  const record = await db.tallyApiKey.create({
    data: { companyId, keyHash, label, createdById },
  });

  return { plainKey, id: record.id };
}

export async function verifyTallyApiKey(
  plainKey: string
): Promise<{ companyId: string; id: string } | null> {
  const activeKeys = await db.tallyApiKey.findMany({
    where: { isActive: true },
    select: { id: true, companyId: true, keyHash: true },
  });

  for (const key of activeKeys) {
    const match = await bcrypt.compare(plainKey, key.keyHash);
    if (match) {
      // Update lastUsedAt without awaiting to keep things fast
      db.tallyApiKey
        .update({ where: { id: key.id }, data: { lastUsedAt: new Date() } })
        .catch(() => {});
      return { companyId: key.companyId, id: key.id };
    }
  }
  return null;
}

export async function listApiKeys(companyId: string) {
  return db.tallyApiKey.findMany({
    where: { companyId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      label: true,
      isActive: true,
      lastUsedAt: true,
      createdAt: true,
      createdById: true,
    },
  });
}

export async function deactivateApiKey(id: string, companyId: string) {
  return db.tallyApiKey.updateMany({
    where: { id, companyId },
    data: { isActive: false },
  });
}

// ─── Voucher Upsert ────────────────────────────────────────────────────────────

export interface TallyVoucherInput {
  tallyId: string;
  voucherType: string;
  voucherNumber: string;
  date: string; // ISO date string
  narration?: string;
  amount?: number;
  currency?: string;
  partyName?: string;
  ledgerEntries?: unknown[];
  rawXml?: string;
}

export async function upsertVouchers(
  companyId: string,
  vouchers: TallyVoucherInput[]
): Promise<number> {
  let count = 0;
  for (const v of vouchers) {
    await db.tallyVoucher.upsert({
      where: { companyId_tallyId: { companyId, tallyId: v.tallyId } },
      create: {
        companyId,
        tallyId: v.tallyId,
        voucherType: v.voucherType,
        voucherNumber: v.voucherNumber,
        date: new Date(v.date),
        narration: v.narration,
        amount: v.amount ?? 0,
        currency: v.currency ?? "TZS",
        partyName: v.partyName,
        ledgerEntries: JSON.stringify(v.ledgerEntries ?? []),
        rawXml: v.rawXml,
      },
      update: {
        voucherType: v.voucherType,
        voucherNumber: v.voucherNumber,
        date: new Date(v.date),
        narration: v.narration,
        amount: v.amount ?? 0,
        currency: v.currency ?? "TZS",
        partyName: v.partyName,
        ledgerEntries: JSON.stringify(v.ledgerEntries ?? []),
        rawXml: v.rawXml,
      },
    });
    count++;
  }
  return count;
}

// ─── Ledger Upsert ─────────────────────────────────────────────────────────────

export interface TallyLedgerInput {
  name: string;
  group?: string;
  openingBal?: number;
  closingBal?: number;
  currency?: string;
}

export async function upsertLedgers(
  companyId: string,
  ledgers: TallyLedgerInput[]
): Promise<number> {
  let count = 0;
  for (const l of ledgers) {
    await db.tallyLedger.upsert({
      where: { companyId_name: { companyId, name: l.name } },
      create: {
        companyId,
        name: l.name,
        group: l.group,
        openingBal: l.openingBal ?? 0,
        closingBal: l.closingBal ?? 0,
        currency: l.currency ?? "TZS",
        syncedAt: new Date(),
      },
      update: {
        group: l.group,
        openingBal: l.openingBal ?? 0,
        closingBal: l.closingBal ?? 0,
        currency: l.currency ?? "TZS",
        syncedAt: new Date(),
      },
    });
    count++;
  }
  return count;
}

// ─── Sync Log ──────────────────────────────────────────────────────────────────

export async function createSyncLog(
  companyId: string,
  status: string,
  vouchersIn: number,
  ledgersIn: number,
  errorMsg?: string,
  triggeredBy = "agent"
) {
  return db.tallySyncLog.create({
    data: { companyId, status, vouchersIn, ledgersIn, errorMsg, triggeredBy },
  });
}

// ─── Queries ───────────────────────────────────────────────────────────────────

export async function listVouchers(
  companyId: string,
  params: {
    voucherType?: string;
    from?: string;
    to?: string;
    search?: string;
    page: number;
    pageSize: number;
  }
) {
  const { voucherType, from, to, search, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(voucherType ? { voucherType } : {}),
    ...(from || to
      ? {
          date: {
            ...(from ? { gte: new Date(from) } : {}),
            ...(to ? { lte: new Date(to) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { voucherNumber: { contains: search } },
            { partyName: { contains: search } },
            { narration: { contains: search } },
          ],
        }
      : {}),
  };

  const [data, total] = await Promise.all([
    db.tallyVoucher.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { date: "desc" },
    }),
    db.tallyVoucher.count({ where }),
  ]);

  return { data, total };
}

export async function listLedgers(companyId: string) {
  return db.tallyLedger.findMany({
    where: { companyId },
    orderBy: { name: "asc" },
  });
}

export async function listSyncLogs(companyId: string) {
  return db.tallySyncLog.findMany({
    where: { companyId },
    orderBy: { syncedAt: "desc" },
    take: 20,
  });
}
