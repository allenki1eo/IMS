import { NextRequest } from "next/server";
import { confirmGRN } from "@/modules/warehouse/grn.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:grn:confirm");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const confirmed = await confirmGRN(
      id,
      auth.user.id,
      auth.user.fullName,
      ipAddress,
      userAgent
    );
    return success(confirmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "GRN not found") return notFound(msg);
    if (msg.includes("Only DRAFT")) return badRequest(msg);
    return handleError(err);
  }
}
