import { NextRequest } from "next/server";
import { dispatchOrder } from "@/modules/dispatch/orders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:dispatch");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await dispatchOrder(companyId, id, auth.user.id, auth.user.fullName, ipAddress);
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Dispatch order not found") return notFound(msg);
    if (
      msg === "Only CONFIRMED orders can be dispatched" ||
      msg.startsWith("Insufficient quantity") ||
      msg.startsWith("Lot not found")
    )
      return badRequest(msg);
    return handleError(err);
  }
}
