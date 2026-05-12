import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { convertAmount } from "./exchange-rates.service";

function generateRef(): string {
  const d = new Date();
  const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
  return `JE-${date}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

export async function listJournalEntries(
  companyId: string,
  params: {
    search?: string;
    status?: string;
    voucherType?: string;
    fromDate?: string;
    toDate?: string;
    page: number;
    pageSize: number;
  }
) {
  const { search, status, voucherType, fromDate, toDate, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(status ? { status } : {}),
    ...(voucherType ? { voucherType } : {}),
    ...(fromDate || toDate
      ? {
          entryDate: {
            ...(fromDate ? { gte: new Date(fromDate) } : {}),
            ...(toDate ? { lte: new Date(toDate) } : {}),
          },
        }
      : {}),
    ...(search
      ? {
          OR: [
            { reference: { contains: search } },
            { description: { contains: search } },
          ],
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    db.journalEntry.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { entryDate: "desc" },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
        },
        _count: { select: { lines: true } },
      },
    }),
    db.journalEntry.count({ where }),
  ]);

  return { data: entries, meta: { total, page, pageSize } };
}

export async function getJournalEntry(companyId: string, id: string) {
  const entry = await db.journalEntry.findUnique({
    where: { id },
    include: {
      lines: {
        include: {
          account: { select: { id: true, code: true, name: true, accountType: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!entry || entry.companyId !== companyId) return null;
  return entry;
}

export async function createJournalEntry(
  companyId: string,
  data: {
    entryDate: string;
    description: string;
    notes?: string;
    voucherType?: string;
    currency?: string;
    exchangeRate?: number | null;
    lines: { accountId: string; description?: string; debit: number; credit: number }[];
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const totalDebit = data.lines.reduce((sum, l) => sum + (l.debit || 0), 0);
  const totalCredit = data.lines.reduce((sum, l) => sum + (l.credit || 0), 0);

  if (Math.abs(totalDebit - totalCredit) > 0.001) {
    throw new Error(`Journal entry is unbalanced. Debit: ${totalDebit}, Credit: ${totalCredit}`);
  }

  if (data.lines.length < 2) throw new Error("Journal entry must have at least 2 lines");

  // Validate accounts exist
  const accountIds = data.lines.map((l) => l.accountId);
  const accounts = await db.account.findMany({
    where: { id: { in: accountIds }, companyId },
    select: { id: true, isActive: true },
  });
  if (accounts.length !== accountIds.length) throw new Error("One or more accounts not found");
  if (accounts.some((a) => !a.isActive)) throw new Error("One or more accounts are inactive");

  const currency = data.currency ?? "TZS";
  let exchangeRate = data.exchangeRate ?? null;

  if (currency !== "TZS" && !exchangeRate) {
    const conversion = await convertAmount(companyId, currency, "TZS", 1);
    exchangeRate = conversion.rate;
  }

  const entry = await db.$transaction(async (tx) => {
    const je = await tx.journalEntry.create({
      data: {
        companyId,
        reference: generateRef(),
        entryDate: new Date(data.entryDate),
        description: data.description,
        notes: data.notes,
        voucherType: data.voucherType || "JOURNAL",
        status: "DRAFT",
        totalDebit,
        totalCredit,
        currency,
        exchangeRate,
        createdById: userId,
        lines: {
          create: data.lines.map((l) => ({
            accountId: l.accountId,
            description: l.description || "",
            debit: l.debit || 0,
            credit: l.credit || 0,
          })),
        },
      },
      include: { lines: true },
    });
    return je;
  });

  await createAuditLog({
    userId,
    userName,
    action: "JOURNAL_CREATE",
    module: "finance",
    resource: "journal",
    recordId: entry.id,
    newValue: { reference: entry.reference, description: entry.description, totalDebit, totalCredit },
    description: `Created journal entry ${entry.reference}`,
    ipAddress,
  });

  return entry;
}

export async function postJournalEntry(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const entry = await db.journalEntry.findUnique({
    where: { id },
    include: { lines: { include: { account: true } } },
  });

  if (!entry || entry.companyId !== companyId) throw new Error("Journal entry not found");
  if (entry.status !== "DRAFT") throw new Error("Only draft journal entries can be posted");

  await db.$transaction(async (tx) => {
    // Update entry status
    await tx.journalEntry.update({
      where: { id },
      data: { status: "POSTED", postedAt: new Date() },
    });

    // Update account balances
    for (const line of entry.lines) {
      const change = (line.debit || 0) - (line.credit || 0);
      await tx.account.update({
        where: { id: line.accountId },
        data: { currentBalance: { increment: change } },
      });
    }
  });

  const updated = await db.journalEntry.findUnique({
    where: { id },
    include: { lines: { include: { account: { select: { id: true, code: true, name: true } } } } },
  });

  await createAuditLog({
    userId,
    userName,
    action: "JOURNAL_POST",
    module: "finance",
    resource: "journal",
    recordId: entry.id,
    oldValue: { status: "DRAFT" },
    newValue: { status: "POSTED" },
    description: `Posted journal entry ${entry.reference}`,
    ipAddress,
  });

  return updated;
}

export async function reverseJournalEntry(
  companyId: string,
  id: string,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const entry = await db.journalEntry.findUnique({
    where: { id },
    include: { lines: true },
  });

  if (!entry || entry.companyId !== companyId) throw new Error("Journal entry not found");
  if (entry.status !== "POSTED") throw new Error("Only posted journal entries can be reversed");

  await db.$transaction(async (tx) => {
    // Reverse the balance changes
    for (const line of entry.lines) {
      const change = (line.credit || 0) - (line.debit || 0); // opposite
      await tx.account.update({
        where: { id: line.accountId },
        data: { currentBalance: { increment: change } },
      });
    }

    await tx.journalEntry.update({
      where: { id },
      data: { status: "REVERSED", reversedAt: new Date() },
    });
  });

  const updated = await db.journalEntry.findUnique({
    where: { id },
    include: { lines: { include: { account: { select: { id: true, code: true, name: true } } } } },
  });

  await createAuditLog({
    userId,
    userName,
    action: "JOURNAL_REVERSE",
    module: "finance",
    resource: "journal",
    recordId: entry.id,
    oldValue: { status: "POSTED" },
    newValue: { status: "REVERSED" },
    description: `Reversed journal entry ${entry.reference}`,
    ipAddress,
  });

  return updated;
}
