import { NextRequest } from "next/server";
import { listJournalEntries, createJournalEntry } from "@/modules/finance/journal-entries.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:journal:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") || undefined;
  const status = searchParams.get("status") || undefined;
  const voucherType = searchParams.get("voucherType") || undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  try {
    const { data, meta } = await listJournalEntries(companyId, {
      search,
      status,
      voucherType,
      fromDate,
      toDate,
      ...pagination,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:journal:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  if (!body.entryDate || !body.description || !body.lines?.length) {
    return badRequest("Entry date, description, and lines are required");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const entry = await createJournalEntry(
      companyId,
      body,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return created(entry);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
