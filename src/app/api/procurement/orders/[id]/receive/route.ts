import { NextRequest } from "next/server";
import { receivePurchaseOrder } from "@/modules/procurement/orders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

type ReceiveLineBody = {
  lineId: string;
  receivedQty: number | string;
};

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "procurement:order:receive");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  if (!Array.isArray(body.lines)) return badRequest("lines is required");

  const { ipAddress } = getRequestMeta(request);
  try {
    const updated = await receivePurchaseOrder(
      companyId,
      id,
      body.lines.map((line: ReceiveLineBody) => ({ lineId: line.lineId, receivedQty: Number(line.receivedQty) })),
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Purchase order not found" || msg === "Purchase order line not found") return notFound(msg);
    if (msg.includes("received") || msg.includes("quantity")) return badRequest(msg);
    return handleError(err);
  }
}
