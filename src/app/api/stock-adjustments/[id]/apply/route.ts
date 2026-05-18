import { NextRequest } from "next/server";
import { applyAdjustment } from "@/modules/warehouse/adjustments.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:adjustment:approve");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const applied = await applyAdjustment(
      id,
      auth.user.id,
      auth.user.fullName,
      ipAddress,
      userAgent
    );
    return success(applied);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Adjustment not found") return notFound(msg);
    if (msg.includes("Only SUBMITTED or APPROVED")) return badRequest(msg);
    return handleError(err);
  }
}
