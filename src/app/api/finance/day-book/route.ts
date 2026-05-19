import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest , handleError } from "@/lib/response";

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

  try {
    const entries = await db.journalEntry.findMany({
      where: {
        companyId,
        status: "POSTED",
        entryDate: {
          gte: new Date(fromDate),
          lte: new Date(new Date(toDate).setHours(23, 59, 59, 999)),
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

    const totalDebit = entries.reduce((sum, e) => sum + (e.totalDebit ?? 0), 0);
    const totalCredit = entries.reduce((sum, e) => sum + (e.totalCredit ?? 0), 0);

    return success({ entries, totalDebit, totalCredit, count: entries.length });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
