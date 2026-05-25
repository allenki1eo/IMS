import { db } from "@/lib/db";

interface TrialBalanceRow {
  id: string;
  code: string;
  name: string;
  accountType: string;
  openingBalance: number;
  currentBalance: number;
}

interface ReportLineRow {
  accountId: string;
  debit?: number | null;
  credit?: number | null;
  account?: {
    id: string;
    code: string;
    name: string;
    accountType: string;
  };
}

type BalanceAccountRow = TrialBalanceRow;

function parseDate(value: string, label: string, endOfDay = false) {
  const date = new Date(endOfDay ? `${value}T23:59:59` : `${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) throw new Error(`${label} is invalid`);
  return date;
}

export async function getTrialBalance(companyId: string) {
  const accounts = await db.account.findMany({
    where: { companyId, isActive: true },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      accountType: true,
      openingBalance: true,
      currentBalance: true,
    },
  });

  // Calculate total debits and credits from journal lines
  const lines = await db.journalEntryLine.findMany({
    where: {
      account: { companyId, isActive: true },
      journalEntry: { status: "POSTED" },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  const accountTotals: Record<string, { debit: number; credit: number }> = {};
  for (const line of lines as ReportLineRow[]) {
    if (!accountTotals[line.accountId]) accountTotals[line.accountId] = { debit: 0, credit: 0 };
    accountTotals[line.accountId].debit += line.debit || 0;
    accountTotals[line.accountId].credit += line.credit || 0;
  }

  const data = (accounts as TrialBalanceRow[]).map((acc) => {
    const totals = accountTotals[acc.id] || { debit: 0, credit: 0 };
    return {
      ...acc,
      totalDebit: totals.debit,
      totalCredit: totals.credit,
      netBalance: acc.currentBalance,
    };
  });

  const totalDebit = data.reduce((sum, row) => sum + row.totalDebit, 0);
  const totalCredit = data.reduce((sum, row) => sum + row.totalCredit, 0);

  return { data, totalDebit, totalCredit, isBalanced: Math.abs(totalDebit - totalCredit) < 0.001 };
}

export async function getIncomeStatement(
  companyId: string,
  params: { fromDate: string; toDate: string }
) {
  const fromDate = parseDate(params.fromDate, "From date");
  const toDate = parseDate(params.toDate, "To date", true);
  if (fromDate > toDate) throw new Error("From date must be before to date");

  const lines = await db.journalEntryLine.findMany({
    where: {
      account: { companyId, isActive: true, accountType: { in: ["REVENUE", "EXPENSE"] } },
      journalEntry: {
        status: "POSTED",
        entryDate: { gte: fromDate, lte: toDate },
      },
    },
    include: {
      account: { select: { id: true, code: true, name: true, accountType: true } },
    },
  });

  const revenueAccounts: Record<string, { code: string; name: string; amount: number }> = {};
  const expenseAccounts: Record<string, { code: string; name: string; amount: number }> = {};

  let totalRevenue = 0;
  let totalExpenses = 0;

  for (const line of lines as ReportLineRow[]) {
    const acc = line.account;
    if (!acc) continue;
    const net = (line.credit || 0) - (line.debit || 0);

    if (acc.accountType === "REVENUE") {
      if (!revenueAccounts[acc.id]) revenueAccounts[acc.id] = { code: acc.code, name: acc.name, amount: 0 };
      revenueAccounts[acc.id].amount += net;
      totalRevenue += net;
    } else if (acc.accountType === "EXPENSE") {
      if (!expenseAccounts[acc.id]) expenseAccounts[acc.id] = { code: acc.code, name: acc.name, amount: 0 };
      expenseAccounts[acc.id].amount += Math.abs(net);
      totalExpenses += Math.abs(net);
    }
  }

  return {
    revenue: Object.values(revenueAccounts).filter((a) => a.amount !== 0),
    expenses: Object.values(expenseAccounts).filter((a) => a.amount !== 0),
    totalRevenue,
    totalExpenses,
    netIncome: totalRevenue - totalExpenses,
    fromDate: params.fromDate,
    toDate: params.toDate,
  };
}

export async function getBalanceSheet(companyId: string, asOfDate?: string) {
  const dateFilter = asOfDate ? parseDate(asOfDate, "As of date", true) : new Date();

  const accounts = await db.account.findMany({
    where: { companyId, isActive: true, accountType: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
    orderBy: { code: "asc" },
    select: {
      id: true,
      code: true,
      name: true,
      accountType: true,
      openingBalance: true,
      currentBalance: true,
    },
  });

  // For posted entries up to the date
  const lines = await db.journalEntryLine.findMany({
    where: {
      account: { companyId, isActive: true, accountType: { in: ["ASSET", "LIABILITY", "EQUITY"] } },
      journalEntry: {
        status: "POSTED",
        entryDate: { lte: dateFilter },
      },
    },
    select: {
      accountId: true,
      debit: true,
      credit: true,
    },
  });

  const accountChanges: Record<string, { debit: number; credit: number }> = {};
  for (const line of lines as ReportLineRow[]) {
    if (!accountChanges[line.accountId]) accountChanges[line.accountId] = { debit: 0, credit: 0 };
    accountChanges[line.accountId].debit += line.debit || 0;
    accountChanges[line.accountId].credit += line.credit || 0;
  }

  const assets: Array<BalanceAccountRow & { balance: number }> = [];
  const liabilities: Array<BalanceAccountRow & { balance: number }> = [];
  const equity: Array<BalanceAccountRow & { balance: number }> = [];

  let totalAssets = 0;
  let totalLiabilities = 0;
  let totalEquity = 0;

  for (const acc of accounts as BalanceAccountRow[]) {
    const changes = accountChanges[acc.id] || { debit: 0, credit: 0 };
    const balance = acc.accountType === "ASSET"
      ? acc.openingBalance + changes.debit - changes.credit
      : acc.openingBalance + changes.credit - changes.debit;

    const item = { ...acc, balance };

    if (acc.accountType === "ASSET") {
      assets.push(item);
      totalAssets += balance;
    } else if (acc.accountType === "LIABILITY") {
      liabilities.push(item);
      totalLiabilities += balance;
    } else if (acc.accountType === "EQUITY") {
      equity.push(item);
      totalEquity += balance;
    }
  }

  return {
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    totalLiabilitiesAndEquity: totalLiabilities + totalEquity,
    isBalanced: Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 0.001,
    asOfDate: asOfDate || new Date().toISOString().split("T")[0],
  };
}
