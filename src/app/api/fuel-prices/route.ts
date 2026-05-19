import { NextRequest } from "next/server";
import { listPrices, createPrice } from "@/modules/fuel/prices.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:price:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const fuelType = searchParams.get("fuelType") ?? undefined;

  try {
    const prices = await listPrices({ fuelType });
    return success(prices);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:price:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { fuelType, pricePerLiter, effectiveFrom, effectiveTo, notes } = body;

  if (!fuelType || typeof fuelType !== "string") return badRequest("fuelType is required");
  if (pricePerLiter == null || typeof pricePerLiter !== "number" || pricePerLiter <= 0)
    return badRequest("pricePerLiter must be a positive number");
  if (!effectiveFrom) return badRequest("effectiveFrom is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const price = await createPrice({
      companyId,
      fuelType,
      pricePerLiter,
      effectiveFrom: new Date(effectiveFrom),
      effectiveTo: effectiveTo ? new Date(effectiveTo) : null,
      notes: notes ?? null,
      recordedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
    });
    return created(price);
  } catch (err) {
    console.error(err);
    return handleError(err);
  }
}
