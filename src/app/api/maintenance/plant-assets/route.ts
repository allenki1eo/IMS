import { NextRequest } from "next/server";
import {
  listPlantAssets,
  createPlantAsset,
} from "@/modules/maintenance/plant-assets.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "maintenance:workorder:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const category = searchParams.get("category") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listPlantAssets(companyId, {
      search,
      category,
      status,
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
  const auth = await requirePermission(request, "maintenance:workorder:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { code, name, category, location, notes, status, branchId } = body;

  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!category || typeof category !== "string") return badRequest("category is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const asset = await createPlantAsset(
      companyId,
      {
        code,
        name,
        category,
        location: location ?? null,
        notes: notes ?? null,
        status: status ?? "ACTIVE",
        branchId: branchId ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(asset);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (
      msg === "code is required" ||
      msg === "name is required" ||
      msg.includes("category must be") ||
      msg.includes("already exists")
    ) {
      return badRequest(msg);
    }
    return handleError(err);
  }
}
