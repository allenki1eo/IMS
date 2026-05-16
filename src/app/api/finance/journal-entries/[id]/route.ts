import { NextRequest } from "next/server";
import { getJournalEntry } from "@/modules/finance/journal-entries.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound , serverError} from "@/lib/response";

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
    return serverError();
  }
}
