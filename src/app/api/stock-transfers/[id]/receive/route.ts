import { NextRequest } from "next/server";
import { receiveTransfer } from "@/modules/warehouse/transfers.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:transfer:receive");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const received = await receiveTransfer(
      id,
      auth.user.id,
      auth.user.fullName,
      ipAddress,
      userAgent
    );
    return success(received);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Transfer not found") return notFound(msg);
    if (msg.includes("Only DISPATCHED")) return badRequest(msg);
    return serverError();
  }
}
