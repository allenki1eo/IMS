import { NextRequest } from "next/server";
import { reverseJournalEntry } from "@/modules/finance/journal-entries.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest } from "@/lib/response";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "finance:journal:reverse");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const { ipAddress } = getRequestMeta(request);

  try {
    const entry = await reverseJournalEntry(
      companyId,
      id,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return success(entry);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
