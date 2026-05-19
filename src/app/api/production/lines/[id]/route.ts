import { NextRequest } from "next/server";
import { getProductionLine } from "@/modules/production/lines.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:line:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const line = await getProductionLine(companyId, id);
  if (!line) return notFound("Production line not found");
  return success(line);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "production:line:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.productionLine.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Production line not found");

    await db.productionLine.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "PRODUCTION_LINE_DELETE",
      module: "production",
      resource: "line",
      recordId: id,
      oldValue: { code: existing.code, name: existing.name },
      description: `Deleted production line: ${existing.name} (${existing.code})`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}

