import { NextRequest } from "next/server";
import { getPayment } from "@/modules/finance/payments.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound , handleError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:payment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const payment = await getPayment(companyId, id);
    if (!payment) return notFound("Payment");
    return success(payment);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:payment:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.payment.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Payment not found");

    await db.payment.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName || auth.user.username,
      action: "PAYMENT_DELETE",
      module: "finance",
      resource: "payment",
      recordId: id,
      oldValue: { paymentNumber: existing.paymentNumber, status: existing.status },
      description: `Deleted payment: ${existing.paymentNumber}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
