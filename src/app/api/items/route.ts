import { NextRequest } from "next/server";
import { listItems, createItem } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:item:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const itemType = searchParams.get("itemType") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  try {
    const { items, total } = await listItems(companyId, {
      search,
      categoryId,
      itemType,
      isActive,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
    });

    return paginated(items, buildMeta(total, paginationParams));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:item:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { code, name, description, categoryId, uomId, itemType, minStock, maxStock, reorderPoint } = body;

  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!uomId || typeof uomId !== "string") return badRequest("uomId is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const item = await createItem({
      companyId,
      code,
      name,
      description: description ?? null,
      categoryId: categoryId ?? null,
      uomId,
      itemType: itemType ?? "RAW_MATERIAL",
      minStock: minStock ?? 0,
      maxStock: maxStock ?? null,
      reorderPoint: reorderPoint ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(item);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Item code already exists");
    return handleError(err);
  }
}
