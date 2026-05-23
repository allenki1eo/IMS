import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { buildMeta } from "@/lib/pagination";
import { listBales, createBale } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:bale:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
  const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20", 10)));
  const seasonId = searchParams.get("seasonId") ?? undefined;
  const lotId = searchParams.get("lotId") ?? undefined;
  const search = searchParams.get("search") ?? undefined;
  const unassigned = searchParams.get("unassigned") === "true";

  try {
    const { data, meta } = await listBales(companyId, { seasonId, lotId, search, page, limit, unassigned });
    return paginated(data, buildMeta(meta.total, { page: meta.page, pageSize: meta.pageSize, skip: 0, take: meta.pageSize }));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:bale:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { seasonId, baleNumber, weight, grade, ginnery, lotId } = body;
  if (!seasonId) return badRequest("seasonId is required");
  if (!baleNumber || typeof baleNumber !== "string") return badRequest("baleNumber is required");
  if (!weight || typeof weight !== "number") return badRequest("weight must be a number");

  try {
    const bale = await createBale(companyId, { seasonId, baleNumber, weight, grade, ginnery, lotId }, auth.user.id);
    return created(bale);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    if (msg.toLowerCase().includes("unique")) return badRequest("Bale number already exists");
    return handleError(err);
  }
}
