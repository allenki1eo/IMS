import { NextRequest } from "next/server";
import { listStandards, createStandard } from "@/modules/qc/standards.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const itemId = searchParams.get("itemId") ?? undefined;
  const isActiveStr = searchParams.get("isActive");
  const isActive = isActiveStr === "true" ? true : isActiveStr === "false" ? false : undefined;

  const { data, meta } = await listStandards(companyId, {
    search,
    itemId,
    isActive,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { code, name, itemId, description } = body;

  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const standard = await createStandard(
      companyId,
      { code, name, itemId: itemId ?? null, description: description ?? null },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(standard);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Item not found" || msg === "A standard with this code already exists")
      return badRequest(msg);
    return serverError();
  }
}
