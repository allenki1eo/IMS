import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";
import { listBuyers, createBuyer } from "@/modules/cotton/cotton.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:buyer:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") ?? undefined;

  try {
    const buyers = await listBuyers(companyId, search);
    return success(buyers);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "cotton:buyer:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { name, contactName, email, phone, address, country, taxNumber } = body;
  if (!name || typeof name !== "string") return badRequest("name is required");

  try {
    const buyer = await createBuyer(companyId, { name, contactName, email, phone, address, country, taxNumber }, auth.user.id);
    return created(buyer);
  } catch (err) {
    return handleError(err);
  }
}
