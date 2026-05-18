import { NextRequest } from "next/server";
import { submitDailyMovement } from "@/modules/transport/daily-movement.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "transport:daily-movement:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await submitDailyMovement({
      id,
      submittedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return success(updated);
  } catch (err: unknown) {
    if (err instanceof Error && (err.message === "Report not found" || err.message === "Only DRAFT reports can be submitted")) {
      return badRequest(err.message);
    }
    console.error("[API Error]", err);
    return handleError(err);
  }
}
