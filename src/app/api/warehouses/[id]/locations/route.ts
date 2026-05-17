import { NextRequest } from "next/server";
import { listLocations, createLocation } from "@/modules/warehouse/warehouse.service";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { NextResponse } from "next/server";
import { success, created, badRequest, serverError } from "@/lib/response";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:location:read");
  if ("error" in auth) return auth.error;

  const { id: warehouseId } = await params;
  const locations = await listLocations(warehouseId);
  return NextResponse.json({ success: true, data: locations, meta: { total: locations.length, page: 1, pageSize: locations.length, totalPages: 1 } });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "warehouse:location:create");
  if ("error" in auth) return auth.error;

  const { id: warehouseId } = await params;
  const body = await request.json();
  const { name, code, parentId, locationType, capacity } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const location = await createLocation({
      warehouseId,
      name,
      code,
      parentId: parentId ?? null,
      locationType: locationType ?? "AREA",
      capacity: capacity ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(location);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Warehouse not found") return badRequest("Warehouse not found");
    if (msg.toLowerCase().includes("unique")) return badRequest("Location code already exists in this warehouse");
    return serverError();
  }
}
