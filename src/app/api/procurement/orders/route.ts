import { NextRequest } from "next/server";
import { listPurchaseOrders, createPurchaseOrder } from "@/modules/procurement/orders.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

type OrderLineBody = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number | string;
  uom?: string;
  unitCost: number | string;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:order:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const supplierId = searchParams.get("supplierId") ?? undefined;

  try {
    const { data, meta } = await listPurchaseOrders(companyId, {
      search,
      status,
      supplierId,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:order:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { supplierId, requestId, expectedDelivery, taxAmount, currency, notes, lines } = body;
  if (!supplierId || typeof supplierId !== "string") return badRequest("supplierId is required");
  if (!requestId && (!Array.isArray(lines) || lines.length === 0)) return badRequest("At least one line is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const order = await createPurchaseOrder(
      companyId,
      {
        supplierId,
        requestId: requestId ?? null,
        expectedDelivery: expectedDelivery ?? null,
        taxAmount: taxAmount == null || taxAmount === "" ? 0 : Number(taxAmount),
        currency: currency ?? "TZS",
        exchangeRate: body.exchangeRate ?? null,
        baseCurrencyAmount: body.baseCurrencyAmount ?? null,
        notes: notes ?? null,
        lines: Array.isArray(lines) ? lines.map((line: OrderLineBody) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          quantity: Number(line.quantity),
          uom: line.uom ?? "PCS",
          unitCost: Number(line.unitCost),
        })) : undefined,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(order);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg === "Supplier not found" ||
      msg === "Supplier is inactive" ||
      msg === "Purchase request not found" ||
      msg.includes("approved") ||
      msg.includes("line")
    ) {
      return badRequest(msg);
    }
    return handleError(err);
  }
}
