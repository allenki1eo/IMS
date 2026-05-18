import { NextRequest } from "next/server";
import { dispatchTransfer } from "@/modules/warehouse/transfers.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:transfer:dispatch");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const dispatched = await dispatchTransfer(
      id,
      auth.user.id,
      auth.user.fullName,
      ipAddress,
      userAgent
    );
    return success(dispatched);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Transfer not found") return notFound(msg);
    if (msg.includes("Only DRAFT")) return badRequest(msg);
    return handleError(err);
  }
}
