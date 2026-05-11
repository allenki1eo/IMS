import { NextRequest } from "next/server";
import { getNCR, updateNCR } from "@/modules/qc/ncr.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:ncr:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const ncr = await getNCR(companyId, id);
  if (!ncr) return notFound("Non-conformance report not found");

  return success(ncr);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:ncr:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const body = await request.json();
  const {
    title,
    description,
    severity,
    disposition,
    rootCause,
    correctiveAction,
    assignedToId,
  } = body;

  const { ipAddress } = getRequestMeta(request);

  try {
    const updated = await updateNCR(
      companyId,
      id,
      {
        ...(title !== undefined ? { title } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(severity !== undefined ? { severity } : {}),
        ...(disposition !== undefined ? { disposition } : {}),
        ...(rootCause !== undefined ? { rootCause } : {}),
        ...(correctiveAction !== undefined ? { correctiveAction } : {}),
        ...(assignedToId !== undefined ? { assignedToId } : {}),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Non-conformance report not found") return notFound(msg);
    if (msg.includes("Only OPEN or IN_REVIEW")) return badRequest(msg);
    return serverError();
  }
}
