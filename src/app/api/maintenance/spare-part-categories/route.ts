import { NextRequest } from "next/server";
import { listCategories, createCategory } from "@/modules/maintenance/parts.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:spare_part:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const categories = await listCategories(companyId);
  return success(categories);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:spare_part:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, code, description } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const category = await createCategory(
      companyId,
      { name, code, description: description ?? null },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(category);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Category code already exists");
    return serverError();
  }
}
