import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

export const PAYMENT_METHODS = ["CASH", "CHEQUE", "ONLINE", "BANK_TRANSFER", "PETTY_CASH"] as const;

export const CASHBOOK_CATEGORIES = {
  RECEIPT: ["Customer Payment", "Loan Received", "Owner Deposit", "Tax Refund", "Investment Income", "Other Income"],
  PAYMENT: ["Rent", "Salaries", "Fuel", "Utilities", "Supplier Payment", "Tax Payment", "Loan Repayment", "Office Supplies", "Equipment", "Transport", "Other Expense"],
  TRANSFER: ["Bank Transfer"],
} as const;

export async function listCashbookEntries(params: {
  companyId: string;
  bankAccountId?: string;
  dateFrom?: Date;
  dateTo?: Date;
  type?: string;
  page?: number;
  pageSize?: number;
}) {
  const { companyId, bankAccountId, dateFrom, dateTo, type, page = 1, pageSize = 50 } = params;

  const where: Record<string, unknown> = { companyId };
  if (bankAccountId) where.bankAccountId = bankAccountId;
  if (type) where.type = type;
  if (dateFrom || dateTo) {
    const dateFilter: Record<string, Date> = {};
    if (dateFrom) dateFilter.gte = dateFrom;
    if (dateTo) dateFilter.lte = dateTo;
    where.date = dateFilter;
  }

  const [entries, total] = await Promise.all([
    db.cashbookEntry.findMany({
      where,
      orderBy: [{ date: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        bankAccount: { select: { id: true, name: true, bankName: true, currency: true, currentBalance: true } },
        transferTo: { select: { id: true, name: true, bankName: true } },
      },
    }),
    db.cashbookEntry.count({ where }),
  ]);

  return { entries, total };
}

export async function createCashbookEntry(params: {
  companyId: string;
  bankAccountId: string;
  date: Date;
  type: string;
  category: string;
  reference?: string | null;
  description: string;
  counterparty?: string | null;
  amount: number;
  transferToId?: string | null;
  notes?: string | null;
  paymentMethod?: string;
  chequeRef?: string | null;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { createdById, userName, ipAddress, userAgent, ...data } = params;

  const bankAccount = await db.bankAccount.findUnique({ where: { id: data.bankAccountId } });
  if (!bankAccount) throw new Error("Bank account not found");
  if (bankAccount.companyId !== data.companyId) throw new Error("Bank account does not belong to this company");

  if (data.type === "TRANSFER") {
    if (!data.transferToId) throw new Error("Transfer destination account is required");
    const destAccount = await db.bankAccount.findUnique({ where: { id: data.transferToId } });
    if (!destAccount) throw new Error("Destination bank account not found");
  }

  // Create entry and update bank balance in a transaction
  const entry = await db.$transaction(async (tx) => {
    // Get next PV number for this company
    const pvSeq = await tx.pVSequence.upsert({
      where: { companyId: data.companyId },
      create: { companyId: data.companyId, lastPV: 1 },
      update: { lastPV: { increment: 1 } },
    });
    const pvNumber = pvSeq.lastPV;

    const created = await tx.cashbookEntry.create({
      data: {
        companyId: data.companyId,
        bankAccountId: data.bankAccountId,
        date: data.date,
        type: data.type,
        category: data.category,
        reference: data.reference ?? null,
        description: data.description,
        counterparty: data.counterparty ?? null,
        amount: data.amount,
        transferToId: data.transferToId ?? null,
        notes: data.notes ?? null,
        pvNumber,
        paymentMethod: data.paymentMethod ?? "CASH",
        chequeRef: data.chequeRef ?? null,
        createdById,
      },
      include: {
        bankAccount: { select: { id: true, name: true, bankName: true, currency: true, currentBalance: true } },
        transferTo: { select: { id: true, name: true, bankName: true } },
      },
    });

    // Update source bank balance
    if (data.type === "RECEIPT") {
      await tx.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { currentBalance: { increment: data.amount } },
      });
    } else if (data.type === "PAYMENT") {
      await tx.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { currentBalance: { decrement: data.amount } },
      });
    } else if (data.type === "TRANSFER" && data.transferToId) {
      await tx.bankAccount.update({
        where: { id: data.bankAccountId },
        data: { currentBalance: { decrement: data.amount } },
      });
      await tx.bankAccount.update({
        where: { id: data.transferToId },
        data: { currentBalance: { increment: data.amount } },
      });
    }

    return created;
  });

  await createAuditLog({
    userId: createdById,
    userName,
    action: "CASHBOOK_ENTRY_CREATE",
    module: "finance",
    resource: "cashbook",
    recordId: entry.id,
    newValue: { type: data.type, amount: data.amount, description: data.description },
    description: `${data.type} of ${data.amount} — ${data.description}`,
    ipAddress,
    userAgent,
    companyId: data.companyId,
  });

  return entry;
}

export async function deleteCashbookEntry(params: {
  id: string;
  deletedById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { id, deletedById, userName, ipAddress, userAgent } = params;

  const entry = await db.cashbookEntry.findUnique({ where: { id } });
  if (!entry) throw new Error("Entry not found");

  await db.$transaction(async (tx) => {
    // Reverse the balance change
    if (entry.type === "RECEIPT") {
      await tx.bankAccount.update({ where: { id: entry.bankAccountId }, data: { currentBalance: { decrement: entry.amount } } });
    } else if (entry.type === "PAYMENT") {
      await tx.bankAccount.update({ where: { id: entry.bankAccountId }, data: { currentBalance: { increment: entry.amount } } });
    } else if (entry.type === "TRANSFER" && entry.transferToId) {
      await tx.bankAccount.update({ where: { id: entry.bankAccountId }, data: { currentBalance: { increment: entry.amount } } });
      await tx.bankAccount.update({ where: { id: entry.transferToId }, data: { currentBalance: { decrement: entry.amount } } });
    }
    await tx.cashbookEntry.delete({ where: { id } });
  });

  await createAuditLog({
    userId: deletedById,
    userName,
    action: "CASHBOOK_ENTRY_DELETE",
    module: "finance",
    resource: "cashbook",
    recordId: id,
    oldValue: { type: entry.type, amount: entry.amount },
    description: `Deleted cashbook entry: ${entry.description}`,
    ipAddress,
    userAgent,
    companyId: entry.companyId,
  });
}

export async function getDailySummary(companyId: string, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const bankAccounts = await db.bankAccount.findMany({
    where: { companyId, isActive: true },
    orderBy: { name: "asc" },
  });

  const summaries = await Promise.all(
    bankAccounts.map(async (account) => {
      const todayEntries = await db.cashbookEntry.findMany({
        where: { bankAccountId: account.id, date: { gte: start, lte: end } },
        orderBy: { createdAt: "asc" },
      });

      const todayReceipts = todayEntries.filter(
        (e) => e.type === "RECEIPT" || (e.type === "TRANSFER" && e.transferToId === account.id)
      );
      const todayPayments = todayEntries.filter(
        (e) => e.type === "PAYMENT" || (e.type === "TRANSFER" && e.bankAccountId === account.id && e.type === "TRANSFER" && e.transferToId !== account.id)
      );

      const totalReceipts = todayReceipts.reduce((s, e) => s + e.amount, 0);
      const totalPayments = todayPayments.reduce((s, e) => s + e.amount, 0);
      const openingBalance = account.currentBalance - totalReceipts + totalPayments;

      return {
        account,
        openingBalance,
        receipts: todayReceipts,
        payments: todayPayments,
        totalReceipts,
        totalPayments,
        closingBalance: account.currentBalance,
        entries: todayEntries,
      };
    })
  );

  return summaries;
}

// Helper: format [17745, 17746, 17747, 17750] → "17745-17747,17750"
function formatPVRange(pvs: number[]): string {
  if (!pvs.length) return "";
  const sorted = [...pvs].sort((a, b) => a - b);
  const ranges: string[] = [];
  let start = sorted[0], end = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === end + 1) {
      end = sorted[i];
    } else {
      ranges.push(start === end ? String(start) : `${start}-${end}`);
      start = end = sorted[i];
    }
  }
  ranges.push(start === end ? String(start) : `${start}-${end}`);
  return ranges.join(",");
}

// Returns entries grouped by category for the company expense summary (Document 1 format)
export async function getCompanyExpenseSummary(companyId: string, date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const entries = await db.cashbookEntry.findMany({
    where: { companyId, date: { gte: start, lte: end } },
    orderBy: { pvNumber: "asc" },
    include: { bankAccount: { select: { name: true, bankName: true } } },
  });

  // Group by category
  const byCategory = new Map<string, typeof entries>();
  for (const entry of entries) {
    const cat = entry.category;
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(entry);
  }

  const grouped = Array.from(byCategory.entries()).map(([category, items]) => ({
    category,
    pvNumbers: items.map((e) => e.pvNumber).filter(Boolean),
    pvDisplay: formatPVRange(items.map((e) => e.pvNumber).filter(Boolean) as number[]),
    items,
    total: items.reduce((s, e) => s + e.amount, 0),
  }));

  return {
    date,
    companyId,
    entries,
    grouped,
    grandTotal: entries.reduce((s, e) => s + e.amount, 0),
  };
}

export async function createBatchCashbookEntries(params: {
  companyId: string;
  entries: Array<{
    bankAccountId: string;
    date: Date;
    type: string;
    category: string;
    description: string;
    counterparty?: string | null;
    reference?: string | null;
    notes?: string | null;
    paymentMethod?: string;
    chequeRef?: string | null;
    amount: number;
    transferToId?: string | null;
  }>;
  createdById: string;
  userName: string;
  ipAddress?: string;
  userAgent?: string;
}) {
  const { companyId, entries, createdById, userName, ipAddress, userAgent } = params;

  // Validate all bank accounts belong to companyId
  const uniqueBankAccountIds = [...new Set(entries.map((e) => e.bankAccountId))];
  const bankAccounts = await db.bankAccount.findMany({
    where: { id: { in: uniqueBankAccountIds } },
    select: { id: true, companyId: true },
  });
  const invalidAccounts = bankAccounts.filter((a) => a.companyId !== companyId);
  if (invalidAccounts.length > 0) throw new Error("Some bank accounts do not belong to this company");
  if (bankAccounts.length !== uniqueBankAccountIds.length) throw new Error("Some bank accounts not found");

  // Run one transaction
  const created = await db.$transaction(async (tx) => {
    const results = [];
    for (const entry of entries) {
      const pvSeq = await tx.pVSequence.upsert({
        where: { companyId },
        create: { companyId, lastPV: 1 },
        update: { lastPV: { increment: 1 } },
      });
      const pvNumber = pvSeq.lastPV;

      const cashbookEntry = await tx.cashbookEntry.create({
        data: {
          companyId,
          bankAccountId: entry.bankAccountId,
          date: entry.date,
          type: entry.type,
          category: entry.category,
          reference: entry.reference ?? null,
          description: entry.description,
          counterparty: entry.counterparty ?? null,
          amount: entry.amount,
          transferToId: entry.transferToId ?? null,
          notes: entry.notes ?? null,
          pvNumber,
          paymentMethod: entry.paymentMethod ?? "CASH",
          chequeRef: entry.chequeRef ?? null,
          createdById,
        },
      });

      // Update bank balance
      if (entry.type === "RECEIPT") {
        await tx.bankAccount.update({
          where: { id: entry.bankAccountId },
          data: { currentBalance: { increment: entry.amount } },
        });
      } else if (entry.type === "PAYMENT") {
        await tx.bankAccount.update({
          where: { id: entry.bankAccountId },
          data: { currentBalance: { decrement: entry.amount } },
        });
      } else if (entry.type === "TRANSFER" && entry.transferToId) {
        await tx.bankAccount.update({
          where: { id: entry.bankAccountId },
          data: { currentBalance: { decrement: entry.amount } },
        });
        await tx.bankAccount.update({
          where: { id: entry.transferToId },
          data: { currentBalance: { increment: entry.amount } },
        });
      }

      results.push(cashbookEntry);
    }
    return results;
  });

  // One audit log for the batch
  const pvNumbers = created.map((e) => e.pvNumber).filter(Boolean) as number[];
  const firstPV = pvNumbers.length ? Math.min(...pvNumbers) : null;
  const lastPV = pvNumbers.length ? Math.max(...pvNumbers) : null;

  await createAuditLog({
    userId: createdById,
    userName,
    action: "CASHBOOK_BATCH_CREATE",
    module: "finance",
    resource: "cashbook",
    recordId: created[0]?.id ?? "batch",
    newValue: { count: created.length, firstPV, lastPV },
    description: `Batch of ${created.length} cashbook entries (PV #${firstPV}–#${lastPV})`,
    ipAddress,
    userAgent,
    companyId,
  });

  return { entries: created, count: created.length, firstPV, lastPV };
}

export async function getDirectorDailySummary(date: Date) {
  const start = new Date(date);
  start.setHours(0, 0, 0, 0);
  const end = new Date(date);
  end.setHours(23, 59, 59, 999);

  const companies = await db.company.findMany({ select: { id: true, name: true } });

  const companiesData = await Promise.all(
    companies.map(async (company) => {
      const bankAccounts = await db.bankAccount.findMany({
        where: { companyId: company.id, isActive: true },
        orderBy: { name: "asc" },
        select: { id: true, name: true, bankName: true, currency: true, currentBalance: true },
      });

      const accountSections = await Promise.all(
        bankAccounts.map(async (account) => {
          const todayEntries = await db.cashbookEntry.findMany({
            where: { bankAccountId: account.id, date: { gte: start, lte: end } },
            orderBy: { createdAt: "asc" },
            include: {
              bankAccount: { select: { id: true, name: true, bankName: true, currency: true, currentBalance: true } },
              transferTo: { select: { id: true, name: true, bankName: true } },
            },
          });

          const payments = todayEntries.filter(
            (e) => e.type === "PAYMENT" || (e.type === "TRANSFER" && e.bankAccountId === account.id)
          );
          const receipts = todayEntries.filter(
            (e) => e.type === "RECEIPT" || (e.type === "TRANSFER" && e.transferToId === account.id)
          );

          const totalPayments = payments.reduce((s, e) => s + e.amount, 0);
          const totalReceipts = receipts.reduce((s, e) => s + e.amount, 0);

          return {
            account,
            payments,
            receipts,
            totalPayments,
            totalReceipts,
          };
        })
      );

      const totalPayments = accountSections.reduce((s, a) => s + a.totalPayments, 0);
      const totalReceipts = accountSections.reduce((s, a) => s + a.totalReceipts, 0);
      const currentBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);
      // Opening balance = current balance minus today's net movement
      const openingBalance = currentBalance - totalReceipts + totalPayments;
      const grossClosingBalance = openingBalance + totalReceipts - totalPayments;

      return {
        company,
        openingBalance,
        accountSections,
        totalPayments,
        totalReceipts,
        grossClosingBalance,
      };
    })
  );

  const grandTotal = {
    openingBalance: companiesData.reduce((s, c) => s + c.openingBalance, 0),
    totalReceipts: companiesData.reduce((s, c) => s + c.totalReceipts, 0),
    totalPayments: companiesData.reduce((s, c) => s + c.totalPayments, 0),
    grossClosingBalance: companiesData.reduce((s, c) => s + c.grossClosingBalance, 0),
  };

  return { date, companies: companiesData, grandTotal };
}

export async function getDirectorSummary(dateFrom: Date, dateTo: Date) {
  const companies = await db.company.findMany({ select: { id: true, name: true } });

  const summaries = await Promise.all(
    companies.map(async (company) => {
      const [bankAccounts, receiptsAgg, paymentsAgg] = await Promise.all([
        db.bankAccount.findMany({
          where: { companyId: company.id, isActive: true },
          select: { id: true, name: true, bankName: true, currency: true, currentBalance: true },
        }),
        db.cashbookEntry.aggregate({
          where: { companyId: company.id, type: "RECEIPT", date: { gte: dateFrom, lte: dateTo } },
          _sum: { amount: true },
        }),
        db.cashbookEntry.aggregate({
          where: { companyId: company.id, type: "PAYMENT", date: { gte: dateFrom, lte: dateTo } },
          _sum: { amount: true },
        }),
      ]);

      const totalBalance = bankAccounts.reduce((s, a) => s + a.currentBalance, 0);

      return {
        company,
        bankAccounts,
        totalBalance,
        periodReceipts: receiptsAgg._sum.amount ?? 0,
        periodPayments: paymentsAgg._sum.amount ?? 0,
      };
    })
  );

  return summaries;
}
