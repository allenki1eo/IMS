import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest , handleError } from "@/lib/response";

interface OutstandingPaymentRow {
  id: string;
  paymentNumber: string;
  reference: string | null;
  paymentDate: Date;
  partyName: string;
  notes: string | null;
  amount: number;
  currency: string;
  bankAccount?: { name: string; currency: string } | null;
}

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:payment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") ?? "payable"; // payable | receivable
  if (type !== "payable" && type !== "receivable") return badRequest("type must be payable or receivable");

  const paymentType = type === "payable" ? "PAYMENT" : "RECEIPT";

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
    const enriched = (payments as OutstandingPaymentRow[]).map((p) => {
      const daysOverdue = Math.floor((now.getTime() - new Date(p.paymentDate).getTime()) / 86_400_000);
      return {
        id: p.id,
        reference: p.reference || p.paymentNumber,
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

    const totalOutstanding = enriched.reduce((sum, payment) => sum + payment.outstanding, 0);
    const overdueCount = enriched.filter((payment) => payment.daysOverdue > 0).length;

    return success({ payments: enriched, totalOutstanding, overdueCount, count: enriched.length });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
