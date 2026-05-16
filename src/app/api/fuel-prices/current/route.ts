import { NextRequest } from "next/server";
import { getCurrentPrice } from "@/modules/fuel/prices.service";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound , serverError} from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "fuel:price:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const fuelType = searchParams.get("fuelType");
  if (!fuelType) return badRequest("fuelType query parameter is required");

  try {
    const price = await getCurrentPrice(companyId, fuelType);
    if (!price) return notFound(`No current price found for fuel type: ${fuelType}`);

    return success(price);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}
