import { NextRequest } from "next/server";
import { listCategories, createCategory } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { success, created, badRequest, serverError, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:category:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  try {
    const categories = await listCategories(companyId, { search });
    return NextResponse.json({ success: true, data: categories, meta: { total: categories.length, page: 1, pageSize: categories.length, totalPages: 1 } });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:category:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, code, description, parentId } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const category = await createCategory({
      companyId,
      name,
      code,
      description: description ?? null,
      parentId: parentId ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(category);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Category code already exists");
    return handleError(err);
  }
}
