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

// ─── Master Data Upserts ──────────────────────────────────────────────────────

export interface TallyWarehouseInput {
  name: string;
  code: string;
}

export interface TallyUnitInput {
  name: string;
  code: string;
  symbol: string;
}

export interface TallyCategoryInput {
  name: string;
  code: string;
  parentName?: string;
}

export interface TallyStockItemInput {
  name: string;
  code: string;
  groupName?: string;
  uomName?: string;
  itemType?: string;
}

/** Upsert Tally godowns → Warehouse table */
export async function upsertWarehouses(
  companyId: string,
  items: TallyWarehouseInput[]
): Promise<number> {
  let count = 0;
  for (const w of items) {
    await db.warehouse.upsert({
      where: { companyId_code: { companyId, code: w.code } },
      create: {
        companyId,
        name: w.name,
        code: w.code,
        warehouseType: "MAIN",
        isActive: true,
        createdById: "tally-sync",
      },
      update: { name: w.name },
    });
    count++;
  }
  return count;
}

/** Upsert Tally units → UnitOfMeasure table */
export async function upsertUnits(
  companyId: string,
  items: TallyUnitInput[]
): Promise<number> {
  let count = 0;
  for (const u of items) {
    await db.unitOfMeasure.upsert({
      where: { companyId_code: { companyId, code: u.code } },
      create: {
        companyId,
        name: u.name,
        code: u.code,
        symbol: u.symbol,
        isBase: false,
        isActive: true,
      },
      update: { name: u.name, symbol: u.symbol },
    });
    count++;
  }
  return count;
}

/** Upsert Tally stock groups → ItemCategory table */
export async function upsertCategories(
  companyId: string,
  items: TallyCategoryInput[]
): Promise<number> {
  let count = 0;
  for (const c of items) {
    await db.itemCategory.upsert({
      where: { companyId_code: { companyId, code: c.code } },
      create: {
        companyId,
        name: c.name,
        code: c.code,
        isActive: true,
      },
      update: { name: c.name },
    });
    count++;
  }
  return count;
}

/** Upsert Tally stock items → Item table */
export async function upsertStockItems(
  companyId: string,
  items: TallyStockItemInput[]
): Promise<number> {
  // Build lookup maps so we avoid per-item DB queries
  const [uoms, categories] = await Promise.all([
    db.unitOfMeasure.findMany({ where: { companyId }, select: { id: true, name: true, code: true } }),
    db.itemCategory.findMany({ where: { companyId }, select: { id: true, name: true, code: true } }),
  ]);

  const uomByName = new Map(uoms.map((u) => [u.name.toLowerCase(), u.id]));
  const uomByCode = new Map(uoms.map((u) => [u.code.toLowerCase(), u.id]));
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  // Fallback UOM — use first available or create "PCS"
  let fallbackUomId = uoms[0]?.id ?? null;
  if (!fallbackUomId) {
    const pcs = await db.unitOfMeasure.create({
      data: { companyId, name: "Pieces", code: "PCS", symbol: "PCS", isBase: true, isActive: true },
    });
    fallbackUomId = pcs.id;
  }

  let count = 0;
  for (const item of items) {
    const uomId =
      (item.uomName && (uomByName.get(item.uomName.toLowerCase()) ?? uomByCode.get(item.uomName.toLowerCase()))) ||
      fallbackUomId;

    const categoryId = item.groupName
      ? catByName.get(item.groupName.toLowerCase()) ?? null
      : null;

    await db.item.upsert({
      where: { companyId_code: { companyId, code: item.code } },
      create: {
        companyId,
        code: item.code,
        name: item.name,
        uomId: uomId!,
        categoryId,
        itemType: item.itemType ?? "RAW_MATERIAL",
        isActive: true,
        createdById: "tally-sync",
      },
      update: {
        name: item.name,
        uomId: uomId!,
        categoryId,
        itemType: item.itemType ?? "RAW_MATERIAL",
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
