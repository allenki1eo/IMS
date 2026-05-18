import { NextRequest } from "next/server";
import { submitAdjustment } from "@/modules/warehouse/adjustments.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:adjustment:submit");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const submitted = await submitAdjustment(
      id,
      auth.user.id,
      auth.user.fullName,
      ipAddress,
      userAgent
    );
    return success(submitted);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Adjustment not found") return notFound(msg);
    if (msg.includes("Only DRAFT")) return badRequest(msg);
    return handleError(err);
  }
}
