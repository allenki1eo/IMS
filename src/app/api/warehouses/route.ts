import { NextRequest } from "next/server";
import { listWarehouses, createWarehouse } from "@/modules/warehouse/warehouse.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:warehouse:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  const warehouses = await listWarehouses(companyId, {
    search,
    branchId,
    isActive,
  });

  return success({ data: warehouses, meta: { total: warehouses.length } });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:warehouse:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, code, address, branchId, managerId } = body;

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
      managerId: managerId ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(warehouse);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Warehouse code already exists");
    return serverError();
  }
}
