import { NextRequest } from "next/server";
import { removeLine } from "@/modules/dispatch/orders.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { noContent, badRequest, notFound, serverError } from "@/lib/response";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; lineId: string }> }
) {
  const auth = await requirePermission(request, "dispatch:order:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id, lineId } = await params;

  try {
    await removeLine(companyId, id, lineId);
    return noContent();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Dispatch order not found" || msg === "Line not found") return notFound(msg);
    if (msg === "Lines can only be removed from DRAFT orders") return badRequest(msg);
    return serverError();
  }
}
