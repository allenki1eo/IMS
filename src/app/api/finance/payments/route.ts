import { NextRequest } from "next/server";
import { listPayments, createPayment } from "@/modules/finance/payments.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:payment:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") || undefined;
  const type = searchParams.get("type") || undefined;
  const status = searchParams.get("status") || undefined;
  const fromDate = searchParams.get("fromDate") || undefined;
  const toDate = searchParams.get("toDate") || undefined;

  try {
    const { data, meta } = await listPayments(companyId, {
      search,
      type,
      status,
      fromDate,
      toDate,
      ...pagination,
    });
    return paginated(data, buildMeta(meta.total, pagination));
  } catch {
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:payment:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  if (!body.type || !body.partyName || !body.amount || !body.paymentDate || !body.paymentMethod) {
    return badRequest("Type, party name, amount, payment date, and payment method are required");
  }

  const { ipAddress } = getRequestMeta(request);

  try {
    const payment = await createPayment(
      companyId,
      body,
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );
    return created(payment);
  } catch (err: any) {
    return badRequest(err.message);
  }
}
