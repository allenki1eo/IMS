import { NextRequest } from "next/server";
import { listReceipts, createReceipt } from "@/modules/fuel/receipts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:receipt:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const tankId = searchParams.get("tankId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listReceipts(companyId, {
      search,
      tankId,
      status,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
    });

    return paginated(data, buildMeta(meta.total, paginationParams));
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:receipt:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { tankId, supplierName, deliveryNoteRef, quantityLiters, pricePerLiter, currency, exchangeRate, baseCurrencyAmount, notes } = body;

  if (!tankId || typeof tankId !== "string") return badRequest("tankId is required");
  if (quantityLiters == null || typeof quantityLiters !== "number" || quantityLiters <= 0)
    return badRequest("quantityLiters must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const receipt = await createReceipt({
      companyId,
      tankId,
      supplierName: supplierName ?? null,
      deliveryNoteRef: deliveryNoteRef ?? null,
      quantityLiters,
      pricePerLiter: pricePerLiter ?? null,
      currency: currency ?? "TZS",
      exchangeRate: exchangeRate ?? null,
      baseCurrencyAmount: baseCurrencyAmount ?? null,
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(receipt);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Fuel tank not found") return badRequest(msg);
    return serverError();
  }
}
