import { NextRequest } from "next/server";
import { getNCR, updateNCR } from "@/modules/qc/ncr.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

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
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:ncr:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.nonConformance.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Non-conformance report not found");

    await db.nonConformance.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "NCR_DELETE",
      module: "qc",
      resource: "ncr",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted non-conformance report: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
