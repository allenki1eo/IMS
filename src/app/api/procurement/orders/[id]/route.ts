import { NextRequest } from "next/server";
import { getPurchaseOrder } from "@/modules/procurement/orders.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const order = await getPurchaseOrder(companyId, id);
  if (!order) return notFound("Purchase order not found");
  return success(order);
}

