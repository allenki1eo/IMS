import { NextRequest } from "next/server";
import { getPayment } from "@/modules/finance/payments.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound , handleError } from "@/lib/response";

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
