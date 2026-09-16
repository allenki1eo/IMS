import { NextRequest } from "next/server";
import { getCompanyById } from "@/modules/company/company.service";
import { requirePermission } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";
import { setCompanyCookie } from "@/lib/company-cookie";

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "company:company:switch");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { companyId } = body;

  if (!companyId || typeof companyId !== "string") {
    return badRequest("Company ID is required");
  }

  const company = await getCompanyById(companyId);
  if (!company) return notFound("Company not found");

  await setCompanyCookie(companyId);

  return success({ companyId, name: company.name });
}
