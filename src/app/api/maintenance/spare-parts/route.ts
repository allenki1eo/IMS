import { NextRequest } from "next/server";
import { listParts, createPart } from "@/modules/maintenance/parts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:spare_part:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const categoryId = searchParams.get("categoryId") ?? undefined;
  const lowStockParam = searchParams.get("lowStock");
  const lowStock = lowStockParam === "true" ? true : undefined;

  try {
    const { data, meta } = await listParts(companyId, {
      search,
      categoryId,
      lowStock,
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
  const auth = await requirePermission(request, "maintenance:spare_part:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const {
    categoryId,
    code,
    name,
    description,
    partNumber,
    uom,
    currentStock,
    minStock,
    unitCost,
  } = body;

  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const part = await createPart(
      companyId,
      {
        categoryId: categoryId ?? null,
        code,
        name,
        description: description ?? null,
        partNumber: partNumber ?? null,
        uom: uom ?? "PCS",
        currentStock: currentStock ?? 0,
        minStock: minStock ?? 0,
        unitCost: unitCost ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(part);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Spare part category not found") return badRequest(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Spare part code already exists");
    return handleError(err);
  }
}
