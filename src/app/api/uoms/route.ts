import { NextRequest } from "next/server";
import { listUOMs, createUOM } from "@/modules/warehouse/items.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { success, created, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:uom:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  try {
    const uoms = await listUOMs(companyId, { search });
    return NextResponse.json({ success: true, data: uoms, meta: { total: uoms.length, page: 1, pageSize: uoms.length, totalPages: 1 } });
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:uom:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, code, symbol, isBase } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!symbol || typeof symbol !== "string") return badRequest("symbol is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const uom = await createUOM({
      companyId,
      name,
      code,
      symbol,
      isBase: isBase ?? false,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(uom);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("UOM code already exists");
    return serverError();
  }
}
