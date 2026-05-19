import { NextRequest } from "next/server";
import { getProductionBatch } from "@/modules/production/batches.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const batch = await getProductionBatch(companyId, id);
  if (!batch) return notFound("Production batch not found");
  return success(batch);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:batch:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.productionBatch.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Production batch not found");

    await db.productionBatch.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "PRODUCTION_BATCH_DELETE",
      module: "production",
      resource: "batch",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted production batch: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}

