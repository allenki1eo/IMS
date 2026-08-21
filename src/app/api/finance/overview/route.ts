import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

/**
 * Aggregated finance overview for the finance dashboard.
 * Replaces 7 client requests (accounts, bank accounts, 2x payments,
 * 2x journals, 500 cashbook rows) with a single cheap aggregate query.
 */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:report:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  try {
    // Start of the month 5 months ago (6-month window incl. current month)
    const now = new Date();
    const windowStart = new Date(now.getFullYear(), now.getMonth() - 5, 1);

    const [
      totalAccounts,
      bankAccounts,
      pendingPayments,
      completedPayments,
      draftJournals,
      postedJournals,
      cashbookRows,
    ] = await Promise.all([
      db.account.count({ where: { companyId } }),
      db.bankAccount.findMany({
        where: { companyId, isActive: true },
        select: { id: true, name: true, currentBalance: true, accountType: true },
        orderBy: { name: "asc" },
      }),
      db.payment.count({ where: { companyId, status: "PENDING" } }),
      db.payment.count({ where: { companyId, status: "COMPLETED" } }),
      db.journalEntry.count({ where: { companyId, status: "DRAFT" } }),
      db.journalEntry.count({ where: { companyId, status: "POSTED" } }),
      db.cashbookEntry.findMany({
        where: { companyId, date: { gte: windowStart } },
        select: { type: true, amount: true, date: true },
      }),
    ]);

    // Build the 6-month receipts vs payments trend server-side
    const months: { key: string; month: string; receipts: number; payments: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
        month: d.toLocaleString("default", { month: "short" }),
        receipts: 0,
        payments: 0,
      });
    }
    const byKey = new Map(months.map((m) => [m.key, m]));
    for (const row of cashbookRows) {
      const d = new Date(row.date);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const bucket = byKey.get(key);
      if (!bucket) continue;
      if (row.type === "RECEIPT") bucket.receipts += row.amount;
      else if (row.type === "PAYMENT") bucket.payments += row.amount;
    }

    const totalBankBalance = bankAccounts.reduce((s, b) => s + (b.currentBalance || 0), 0);

    return success({
      totalAccounts,
      totalBankBalance,
      bankAccounts,
      monthlyTrend: months.map(({ month, receipts, payments }) => ({ month, receipts, payments })),
      pendingPayments,
      completedPayments,
      draftJournals,
      postedJournals,
    });
  } catch {
    return badRequest("Failed to load finance overview");
  }
}
