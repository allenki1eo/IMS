import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest , handleError } from "@/lib/response";

interface DayBookEntry {
  totalDebit?: number | null;
  totalCredit?: number | null;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:journal:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const voucherType = searchParams.get("voucherType") || undefined;

  if (!fromDate || !toDate) return badRequest("fromDate and toDate are required");

  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T23:59:59`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return badRequest("Invalid date range");
  if (from > to) return badRequest("From date must be before to date");

  try {
    const entries = await db.journalEntry.findMany({
      where: {
        companyId,
        status: "POSTED",
        entryDate: {
          gte: from,
          lte: to,
        },
        ...(voucherType ? { voucherType } : {}),
      },
      include: {
        lines: {
          include: {
            account: { select: { id: true, code: true, name: true } },
          },
          orderBy: { debit: "desc" },
        },
      },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
    });

    const totalDebit = (entries as DayBookEntry[]).reduce((sum, entry) => sum + (entry.totalDebit ?? 0), 0);
    const totalCredit = (entries as DayBookEntry[]).reduce((sum, entry) => sum + (entry.totalCredit ?? 0), 0);

    return success({ entries, totalDebit, totalCredit, count: entries.length });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
