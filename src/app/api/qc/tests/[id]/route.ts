import { NextRequest } from "next/server";
import { getTest } from "@/modules/qc/tests.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:test:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const test = await getTest(companyId, id);
  if (!test) return notFound("Quality test not found");

  return success(test);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "qc:test:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.qualityTest.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Quality test not found");

    await db.qualityTest.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "QUALITY_TEST_DELETE",
      module: "qc",
      resource: "test",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted quality test: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
