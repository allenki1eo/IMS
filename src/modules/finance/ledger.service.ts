import { db } from "@/lib/db";

interface LedgerLineRow {
  id: string;
  debit?: number | null;
  credit?: number | null;
  description?: string | null;
  journalEntry: {
    entryDate: Date;
    reference: string;
    voucherType: string;
    description: string;
  };
}

export async function getLedger(
  companyId: string,
  accountId: string,
  params: {
    fromDate?: string;
    toDate?: string;
    page: number;
    pageSize: number;
  }
) {
  const { fromDate, toDate, page, pageSize } = params;
  const skip = (page - 1) * pageSize;

  const dateFilter: any = {};
  if (fromDate) dateFilter.gte = new Date(fromDate);
  if (toDate) dateFilter.lte = new Date(toDate + "T23:59:59");

  const where = {
    accountId,
    journalEntry: {
      companyId,
      status: "POSTED",
      ...(Object.keys(dateFilter).length > 0 ? { entryDate: dateFilter } : {}),
    },
  };

  const [lines, total] = await Promise.all([
    db.journalEntryLine.findMany({
      where,
      orderBy: { journalEntry: { entryDate: "asc" } },
      skip,
      take: pageSize,
      include: {
        journalEntry: {
          select: {
            id: true,
            reference: true,
            entryDate: true,
            voucherType: true,
            description: true,
          },
        },
      },
    }),
    db.journalEntryLine.count({ where }),
  ]);

  // Get opening balance (all posted lines before fromDate)
  let openingBalance = 0;
  if (fromDate) {
    const priorLines = await db.journalEntryLine.findMany({
      where: {
        accountId,
        journalEntry: {
          companyId,
          status: "POSTED",
          entryDate: { lt: new Date(fromDate) },
        },
      },
      select: { debit: true, credit: true },
    });
    openingBalance = priorLines.reduce((sum: number, line: { debit?: number | null; credit?: number | null }) => (
      sum + (line.debit || 0) - (line.credit || 0)
    ), 0);
  } else {
    const account = await db.account.findUnique({
      where: { id: accountId },
      select: { openingBalance: true },
    });
    openingBalance = account?.openingBalance || 0;
  }

  // Compute running balance
  let runningBalance = openingBalance;
  const ledgerLines = (lines as LedgerLineRow[]).map((line) => {
    const change = (line.debit || 0) - (line.credit || 0);
    runningBalance += change;
    return {
      id: line.id,
      date: line.journalEntry.entryDate,
      reference: line.journalEntry.reference,
      voucherType: line.journalEntry.voucherType,
      description: line.description || line.journalEntry.description,
      debit: line.debit || 0,
      credit: line.credit || 0,
      balance: runningBalance,
    };
  });

  return {
    data: ledgerLines,
    meta: { total, page, pageSize },
    openingBalance,
    closingBalance: runningBalance,
  };
}
