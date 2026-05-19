import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { listWarehouses, createWarehouse } from "@/modules/warehouse/warehouse.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { created, badRequest, handleError } from "@/lib/response";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:warehouse:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;
  const warehouseType = searchParams.get("warehouseType") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  try {
    const warehouses = await listWarehouses(companyId, {
      search,
      branchId,
      isActive,
      warehouseType,
    });

    return NextResponse.json({ success: true, data: warehouses, meta: { total: warehouses.length, page: 1, pageSize: warehouses.length, totalPages: 1 } });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:warehouse:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("No company context. Please log out and log in again.");

  const company = await db.company.findUnique({ where: { id: companyId }, select: { id: true } });
  if (!company) return badRequest("Company not found. Please log out and log in again.");

  const body = await request.json();
  const { name, code, address, branchId, warehouseType } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const warehouse = await createWarehouse({
      companyId,
      name,
      code,
      address: address ?? null,
      branchId: branchId ?? null,
      warehouseType: warehouseType ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(warehouse);
  } catch (err) {
    console.error("[API Error] createWarehouse:", err);
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") return badRequest("A warehouse with this code already exists for your company");
      return badRequest(`Database error (${err.code}): ${err.message.slice(0, 200)}`);
    }
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.toLowerCase().includes("unique")) return badRequest("A warehouse with this code already exists");
    return handleError(err);
  }
}
