import { NextRequest } from "next/server";
import { getCurrentPrice } from "@/modules/fuel/prices.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:price:read");
  if ("error" in auth) return auth.error;

  const { searchParams } = new URL(request.url);
  const fuelType = searchParams.get("fuelType");
  if (!fuelType) return badRequest("fuelType query parameter is required");

  try {
    const price = await getCurrentPrice(fuelType);
    if (!price) return notFound(`No current price found for fuel type: ${fuelType}`);
    return success(price);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
