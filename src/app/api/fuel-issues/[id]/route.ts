import { NextRequest } from "next/server";
import { getIssueById } from "@/modules/fuel/issues.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, noContent, notFound, handleError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:issue:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const issue = await getIssueById(id);
  if (!issue) return notFound("Fuel issue not found");

  return success(issue);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "fuel:issue:delete");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.fuelIssue.findUnique({ where: { id } });
    if (!existing) return notFound("Fuel issue not found");

    await db.fuelIssue.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName,
      action: "FUEL_ISSUE_DELETE",
      module: "fuel",
      resource: "issue",
      recordId: id,
      oldValue: { reference: existing.reference },
      description: `Deleted fuel issue: ${existing.reference}`,
      ipAddress,
      companyId: existing.companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
