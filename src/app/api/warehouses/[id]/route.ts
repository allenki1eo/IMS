import { NextRequest } from "next/server";
import { getWarehouseById, updateWarehouse } from "@/modules/warehouse/warehouse.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:warehouse:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  const warehouse = await getWarehouseById(id);
  if (!warehouse) return notFound("Warehouse not found");
  if (warehouse.companyId !== companyId) return notFound("Warehouse not found");
  return success(warehouse);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:warehouse:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const { name, code, address, branchId, managerId, warehouseType } = body;

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const updated = await updateWarehouse({
      id,
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(code !== undefined ? { code } : {}),
        ...(address !== undefined ? { address } : {}),
        ...(branchId !== undefined ? { branchId } : {}),
        ...(managerId !== undefined ? { managerId } : {}),
        ...(warehouseType !== undefined ? { warehouseType } : {}),
      },
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(updated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Warehouse not found") return notFound(msg);
    if (msg.toLowerCase().includes("unique")) return badRequest("Warehouse code already exists");
    return serverError();
  }
}
