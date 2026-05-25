import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";

type TxClient = any;

function parseFinanceDate(value: string, label: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

export async function listBankAccounts(
  companyId: string,
  params: {
    search?: string;
    accountType?: string;
    isActive?: boolean;
    page: number;
    pageSize: number;
  }
) {
  const { search, accountType, isActive, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const where = {
    companyId,
    ...(accountType ? { accountType } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search } },
            { bankName: { contains: search } },
            { accountNumber: { contains: search } },
          ],
        }
      : {}),
  };

  const [accounts, total] = await Promise.all([
    db.bankAccount.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { name: "asc" },
      include: {
        _count: { select: { transactions: true, payments: true } },
      },
    }),
    db.bankAccount.count({ where }),
  ]);

  return { data: accounts, meta: { total, page, pageSize } };
}

export async function getBankAccount(companyId: string, id: string) {
  const account = await db.bankAccount.findUnique({
    where: { id },
    include: {
      transactions: {
        take: 50,
        orderBy: { transactionDate: "desc" },
      },
      payments: {
        take: 20,
        orderBy: { paymentDate: "desc" },
      },
    },
  });

  if (!account || account.companyId !== companyId) return null;
  return account;
}

export async function createBankAccount(
  companyId: string,
  data: {
    name: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    currency?: string;
    accountType?: string;
    currentBalance?: number;
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const account = await db.bankAccount.create({
    data: {
      companyId,
      name: data.name,
      accountNumber: data.accountNumber,
      bankName: data.bankName,
      branch: data.branch,
      currency: data.currency || "USD",
      accountType: data.accountType || "BANK",
      currentBalance: data.currentBalance ?? 0,
    },
  });

  await createAuditLog({
    userId,
    userName,
    action: "BANK_ACCOUNT_CREATE",
    module: "finance",
    resource: "bank",
    recordId: account.id,
    newValue: { name: account.name, accountType: account.accountType },
    description: `Created bank account ${account.name}`,
    ipAddress,
  });

  return account;
}

export async function updateBankAccount(
  companyId: string,
  id: string,
  data: {
    name?: string;
    accountNumber?: string;
    bankName?: string;
    branch?: string;
    currency?: string;
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  const existing = await db.bankAccount.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Bank account not found");

  const oldValue = { name: existing.name, accountNumber: existing.accountNumber, bankName: existing.bankName };

  const account = await db.bankAccount.update({
    where: { id },
    data,
  });

  await createAuditLog({
    userId,
    userName,
    action: "BANK_ACCOUNT_UPDATE",
    module: "finance",
    resource: "bank",
    recordId: account.id,
    oldValue,
    newValue: { name: account.name, accountNumber: account.accountNumber, bankName: account.bankName },
    description: `Updated bank account ${account.name}`,
    ipAddress,
  });

  return account;
}

export async function toggleBankAccountStatus(
  companyId: string,
  id: string,
  isActive: boolean,
  userId: string,
  userName: string,
  ipAddress: string
) {
  const existing = await db.bankAccount.findUnique({ where: { id } });
  if (!existing || existing.companyId !== companyId) throw new Error("Bank account not found");

  const account = await db.bankAccount.update({
    where: { id },
    data: { isActive },
  });

  await createAuditLog({
    userId,
    userName,
    action: isActive ? "BANK_ACCOUNT_ACTIVATE" : "BANK_ACCOUNT_DEACTIVATE",
    module: "finance",
    resource: "bank",
    recordId: account.id,
    oldValue: { isActive: existing.isActive },
    newValue: { isActive: account.isActive },
    description: `${isActive ? "Activated" : "Deactivated"} bank account ${account.name}`,
    ipAddress,
  });

  return account;
}

export async function createBankTransaction(
  companyId: string,
  data: {
    bankAccountId: string;
    type: string;
    amount: number;
    reference?: string;
    description?: string;
    transactionDate: string;
    counterparty?: string;
  },
  userId: string,
  userName: string,
  ipAddress: string
) {
  if (!Number.isFinite(data.amount) || data.amount <= 0) throw new Error("Amount must be greater than zero");
  if (!["DEPOSIT", "WITHDRAWAL", "TRANSFER"].includes(data.type)) throw new Error("Invalid bank transaction type");
  const transactionDate = parseFinanceDate(data.transactionDate, "Transaction date");

  const bankAccount = await db.bankAccount.findUnique({
    where: { id: data.bankAccountId },
  });
  if (!bankAccount || bankAccount.companyId !== companyId) throw new Error("Bank account not found");

  const tx = await db.$transaction(async (prisma: TxClient) => {
    const transaction = await prisma.bankTransaction.create({
      data: {
        companyId,
        bankAccountId: data.bankAccountId,
        type: data.type,
        amount: data.amount,
        reference: data.reference,
        description: data.description,
        transactionDate,
        counterparty: data.counterparty,
      },
    });

    // Update bank account balance
    const change = data.type === "DEPOSIT" ? data.amount : -data.amount;
    await prisma.bankAccount.update({
      where: { id: data.bankAccountId },
      data: { currentBalance: { increment: change } },
    });

    return transaction;
  });

  await createAuditLog({
    userId,
    userName,
    action: "BANK_TRANSACTION_CREATE",
    module: "finance",
    resource: "bank",
    recordId: tx.id,
    newValue: { type: data.type, amount: data.amount, bankAccountId: data.bankAccountId },
    description: `${data.type} of ${data.amount} on ${bankAccount.name}`,
    ipAddress,
  });

  return tx;
}

export async function listBankTransactions(
  companyId: string,
  bankAccountId: string,
  params: { page: number; pageSize: number; isCleared?: boolean }
) {
  const { page, pageSize, isCleared } = params;
  const skip = (page - 1) * pageSize;

  const where: any = { companyId, bankAccountId };
  if (isCleared !== undefined) where.cleared = isCleared;

  const [transactions, total] = await Promise.all([
    db.bankTransaction.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { transactionDate: "desc" },
    }),
    db.bankTransaction.count({ where }),
  ]);

  return { data: transactions, meta: { total, page, pageSize } };
}

export async function toggleBankTransactionCleared(
  companyId: string,
  transactionId: string,
  isCleared: boolean,
  clearedAt?: string,
  userId?: string,
  userName?: string,
  ipAddress?: string
) {
  const tx = await db.bankTransaction.findUnique({ where: { id: transactionId } });
  if (!tx || tx.companyId !== companyId) throw new Error("Transaction not found");

  const updated = await db.bankTransaction.update({
    where: { id: transactionId },
    data: {
      cleared: isCleared,
      clearedAt: isCleared && clearedAt ? new Date(clearedAt) : null,
    },
  });

  if (userId && userName) {
    await createAuditLog({
      userId,
      userName,
      action: isCleared ? "BANK_TXN_CLEAR" : "BANK_TXN_UNCLEAR",
      module: "finance",
      resource: "bank",
      recordId: transactionId,
      oldValue: { cleared: tx.cleared },
      newValue: { cleared: updated.cleared, clearedAt: updated.clearedAt },
      description: `${isCleared ? "Cleared" : "Uncleared"} bank transaction ${tx.reference || tx.id}`,
      ipAddress,
    });
  }

  return updated;
}
