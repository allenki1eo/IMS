import { NextRequest } from "next/server";
import { listProducts, createProduct } from "@/modules/dispatch/products.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:product:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const isActiveStr = searchParams.get("isActive");
  const isActive = isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

  try {
    const { data, meta } = await listProducts(companyId, {
      search,
      isActive,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "dispatch:product:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { code, name, description, uom, unitPrice } = body;

  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const product = await createProduct(
      companyId,
      { code, name, description: description ?? null, uom: uom ?? null, unitPrice: unitPrice ?? null },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(product);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "A product with this code already exists") return badRequest(msg);
    return serverError();
  }
}
