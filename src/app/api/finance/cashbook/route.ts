import { NextRequest } from "next/server";
import { listCashbookEntries, createCashbookEntry } from "@/modules/finance/cashbook.service";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const bankAccountId = searchParams.get("bankAccountId") ?? undefined;
  const type = searchParams.get("type") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ? new Date(searchParams.get("dateFrom")!) : undefined;
  const dateTo = searchParams.get("dateTo") ? new Date(searchParams.get("dateTo")!) : undefined;
  const page = parseInt(searchParams.get("page") ?? "1", 10);
  const pageSize = parseInt(searchParams.get("pageSize") ?? "50", 10);

  try {
    const { entries, total } = await listCashbookEntries({ companyId, bankAccountId, dateFrom, dateTo, type, page, pageSize });
    return success({ data: entries, meta: { total, page, pageSize, totalPages: Math.ceil(total / pageSize) } });
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:write");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { bankAccountId, date, type, category, reference, description, counterparty, amount, transferToId, notes, paymentMethod, chequeRef } = body;

  if (!bankAccountId) return badRequest("bankAccountId is required");
  if (!date) return badRequest("date is required");
  if (!type || !["RECEIPT", "PAYMENT", "TRANSFER"].includes(type)) return badRequest("type must be RECEIPT, PAYMENT, or TRANSFER");
  if (!description) return badRequest("description is required");
  if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) return badRequest("amount must be a positive number");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const entry = await createCashbookEntry({
      companyId, bankAccountId, date: new Date(date), type, category: category ?? type,
      reference, description, counterparty, amount: Number(amount),
      transferToId: transferToId ?? null, notes,
      paymentMethod: paymentMethod ?? "CASH",
      chequeRef: chequeRef ?? null,
      createdById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent,
    });
    return created(entry);
  } catch (err) {
    return handleError(err);
  }
}
