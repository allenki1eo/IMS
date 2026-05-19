import { NextRequest } from "next/server";
import { getJournalEntry } from "@/modules/finance/journal-entries.service";
import { db } from "@/lib/db";
import { createAuditLog } from "@/lib/audit";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, noContent, badRequest, notFound , handleError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:journal:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const entry = await getJournalEntry(companyId, id);
    if (!entry) return notFound("Journal entry");
    return success(entry);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:journal:delete");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const existing = await db.journalEntry.findFirst({ where: { id, companyId } });
    if (!existing) return notFound("Journal entry not found");

    await db.journalEntry.delete({ where: { id } });

    await createAuditLog({
      userId: auth.user.id,
      userName: auth.user.fullName || auth.user.username,
      action: "JOURNAL_ENTRY_DELETE",
      module: "finance",
      resource: "journal",
      recordId: id,
      oldValue: { reference: existing.reference, status: existing.status },
      description: `Deleted journal entry: ${existing.reference}`,
      ipAddress,
      companyId,
    });

    return noContent();
  } catch (err) {
    return handleError(err);
  }
}
