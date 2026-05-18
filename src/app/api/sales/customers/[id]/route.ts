import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/api-helpers";
import { success, notFound, serverError, handleError } from "@/lib/response";
import { getCustomerById } from "@/modules/sales/sales.service";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "sales:customer:read");
  if ("error" in auth) return auth.error;
  try {
    const { id } = await params;
    const customer = await getCustomerById(id);
    if (!customer) return notFound("Customer not found");
    return success(customer);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
