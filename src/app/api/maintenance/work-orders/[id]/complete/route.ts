import { NextRequest } from "next/server";
import { completeWorkOrder } from "@/modules/maintenance/workorders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "maintenance:workorder:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { actualCost, completionNotes, odometerAtService } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await completeWorkOrder(
      companyId,
      id,
      {
        actualCost: actualCost ?? null,
        completionNotes: completionNotes ?? null,
        odometerAtService: odometerAtService ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Work order not found") return notFound(msg);
    if (msg.includes("Only IN_PROGRESS")) return badRequest(msg);
    return serverError();
  }
}
