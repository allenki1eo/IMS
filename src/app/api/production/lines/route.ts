import { NextRequest } from "next/server";
import { listProductionLines, createProductionLine } from "@/modules/production/lines.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "production:line:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const { data, meta } = await listProductionLines(companyId, {
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    lineType: searchParams.get("lineType") ?? undefined,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });
  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "production:line:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  if (!body.code || typeof body.code !== "string") return badRequest("code is required");
  if (!body.name || typeof body.name !== "string") return badRequest("name is required");

  const { ipAddress } = getRequestMeta(request);
  try {
    const line = await createProductionLine(
      companyId,
      {
        code: body.code,
        name: body.name,
        lineType: body.lineType ?? "BREWING",
        location: body.location ?? null,
        capacityPerDay: body.capacityPerDay == null || body.capacityPerDay === "" ? null : Number(body.capacityPerDay),
        uom: body.uom ?? "L",
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(line);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Production line code already exists");
    return serverError();
  }
}

