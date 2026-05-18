import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest , serverError} from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:payment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "payable"; // payable | receivable

  // PAYABLE: payments where direction is outgoing (we owe) and status is PENDING
  // RECEIVABLE: payments where direction is incoming (owed to us) and status is PENDING
  // The Payment model has: type (INCOMING|OUTGOING), status (PENDING|COMPLETED|CANCELLED), amount, paidAmount
  const paymentType = type === "payable" ? "OUTGOING" : "INCOMING";

  try {
    const payments = await db.payment.findMany({
      where: {
        companyId,
        type: paymentType,
        status: "PENDING",
      },
      include: {
        bankAccount: { select: { name: true, currency: true } },
      },
      orderBy: { paymentDate: "asc" },
    });

    const now = new Date();
    const enriched = payments.map((p) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(p.paymentDate).getTime()) / 86_400_000);
      return {
        id: p.id,
        reference: p.reference,
        paymentDate: p.paymentDate,
        daysOverdue: Math.max(0, daysOverdue),
        counterparty: p.partyName,
        description: p.notes,
        amount: p.amount,
        paidAmount: 0,
        outstanding: p.amount,
        currency: p.currency,
        bankAccount: p.bankAccount?.name ?? null,
      };
    });

    const totalOutstanding = enriched.reduce((s, p) => s + p.outstanding, 0);
    const overdueCount = enriched.filter((p) => p.daysOverdue > 0).length;

    return success({ payments: enriched, totalOutstanding, overdueCount, count: enriched.length });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
