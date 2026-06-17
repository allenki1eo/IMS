import { NextRequest } from "next/server";
import { createBatchCashbookEntries } from "@/modules/finance/cashbook.service";
import { requirePermission, getCompanyId, getRequestMeta, parseBody } from "@/lib/api-helpers";
import { success, badRequest, handleError } from "@/lib/response";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:cashbook:write");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { body, error } = await parseBody<{
    entries: Array<{
      bankAccountId: string;
      date: string;
      type: string;
      category: string;
      description: string;
      counterparty?: string | null;
      reference?: string | null;
      paymentMethod?: string;
      chequeRef?: string | null;
      amount: number;
      transferToId?: string | null;
    }>;
  }>(request);
  if (error) return error;

  if (!Array.isArray(body.entries) || body.entries.length === 0) {
    return badRequest("entries must be a non-empty array");
  }

  for (const entry of body.entries) {
    if (!entry.amount || entry.amount <= 0) {
      return badRequest(`All entry amounts must be greater than 0`);
    }
  }

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const result = await createBatchCashbookEntries({
      companyId,
      entries: body.entries.map((e) => ({
        ...e,
        date: new Date(e.date),
      })),
      createdById: auth.user.id,
      userName: auth.user.username,
      ipAddress,
      userAgent,
    });

    return success({ count: result.count, firstPV: result.firstPV, lastPV: result.lastPV });
  } catch (err) {
    return handleError(err);
  }
}
