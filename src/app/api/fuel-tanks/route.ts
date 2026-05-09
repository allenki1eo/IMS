import { NextRequest } from "next/server";
import { listTanks, createTank } from "@/modules/fuel/tanks.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:tank:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;
  const fuelType = searchParams.get("fuelType") ?? undefined;
  const branchId = searchParams.get("branchId") ?? undefined;
  const isActiveParam = searchParams.get("isActive");
  const isActive =
    isActiveParam === "true" ? true : isActiveParam === "false" ? false : undefined;

  const tanks = await listTanks(companyId, { search, fuelType, branchId, isActive });
  return success(tanks);
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:tank:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { branchId, name, code, fuelType, capacity, currentLevel, minLevel, notes } = body;

  if (!name || typeof name !== "string") return badRequest("name is required");
  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!fuelType || typeof fuelType !== "string") return badRequest("fuelType is required");
  if (capacity == null || typeof capacity !== "number" || capacity <= 0)
    return badRequest("capacity must be a positive number");

  const { ipAddress } = getRequestMeta(request);

  try {
    const tank = await createTank({
      companyId,
      branchId: branchId ?? null,
      name,
      code,
      fuelType,
      capacity,
      currentLevel: currentLevel ?? 0,
      minLevel: minLevel ?? 0,
      notes: notes ?? null,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(tank);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Tank code already exists");
    return serverError();
  }
}
