import { NextRequest } from "next/server";
import { resolveNCR } from "@/modules/qc/ncr.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:ncr:resolve");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const { disposition, rootCause, correctiveAction } = body;

  if (!disposition || typeof disposition !== "string") return badRequest("disposition is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await resolveNCR(
      companyId,
      id,
      {
        disposition,
        rootCause: rootCause ?? null,
        correctiveAction: correctiveAction ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Non-conformance report not found") return notFound(msg);
    if (msg.includes("already resolved") || msg.includes("already closed")) return badRequest(msg);
    return serverError();
  }
}
