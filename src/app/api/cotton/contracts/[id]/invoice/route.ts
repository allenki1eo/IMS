import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { created, badRequest, handleError } from "@/lib/response";
import { createInvoice } from "@/modules/cotton/cotton.service";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "cotton:invoice:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id: contractId } = await params;

  try {
    const invoice = await createInvoice(companyId, contractId, auth.user.id);
    return created(invoice);
  } catch (err) {
    return handleError(err);
  }
}
