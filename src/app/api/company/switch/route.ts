import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { getCompanyById } from "@/modules/company/company.service";
import { requireAuth } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const { companyId } = body;

  if (!companyId || typeof companyId !== "string") {
    return badRequest("Company ID is required");
  }

  const company = await getCompanyById(companyId);
  if (!company) return notFound("Company not found");

  const cookieStore = await cookies();
  cookieStore.set("erp_company_id", companyId, {
    httpOnly: true,
    secure:
      process.env.NODE_ENV === "production" ||
      process.env.FORCE_HTTPS === "true",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
  });

  return success({ companyId, name: company.name });
}
