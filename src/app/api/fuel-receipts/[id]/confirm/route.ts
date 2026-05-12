import { NextRequest } from "next/server";
import { confirmReceipt } from "@/modules/fuel/receipts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:receipt:confirm");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const confirmed = await confirmReceipt(id, companyId, auth.user.id, auth.user.fullName, ipAddress);
    return success(confirmed);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel receipt not found") return notFound(msg);
    if (msg === "Fuel tank not found") return notFound(msg);
    if (msg.includes("Only DRAFT")) return badRequest(msg);
    return serverError();
  }
}
