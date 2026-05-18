import { NextRequest } from "next/server";
import { completeTest } from "@/modules/qc/tests.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError, handleError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:test:complete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const { notes } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await completeTest(
      companyId,
      id,
      { notes: notes ?? null },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality test not found") return notFound(msg);
    if (msg.includes("Only IN_PROGRESS")) return badRequest(msg);
    return handleError(err);
  }
}
