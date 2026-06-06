import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

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
