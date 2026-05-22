import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { buildMeta } from "@/lib/pagination";
import { listLots, createLot } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:lot:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const seasonId = searchParams.get("seasonId") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const search = searchParams.get("search") ?? undefined;

  try {
    const { data, meta } = await listLots(companyId, { seasonId, status, search, page, limit });
    return paginated(data, buildMeta(meta.total, { page: meta.page, pageSize: meta.pageSize, skip: 0, take: meta.pageSize }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:lot:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { seasonId, lotNumber, description } = body;
  if (!seasonId) return badRequest("seasonId is required");
  if (!lotNumber || typeof lotNumber !== "string") return badRequest("lotNumber is required");

  try {
    const lot = await createLot(companyId, { seasonId, lotNumber, description }, auth.user.id);
    return created(lot);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("unique")) return badRequest("Lot number already exists");
    return handleError(err);
  }
}
