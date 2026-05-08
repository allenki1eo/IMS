import { NextRequest } from "next/server";
import { getCompany, updateCompany } from "@/modules/company/company.service";
import { updateCompanySchema } from "@/modules/company/company.validation";
import { requirePermission, requireAuth, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  const company = await getCompany();
  if (!company) return notFound("Company not configured");
  return success(company);
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, "company:company:update");
  if ("error" in auth) return auth.error;
  const company = await getCompany();
  if (!company) return notFound("Company not configured");
  const body = await request.json();
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    const updated = await updateCompany({ id: company.id, data: parsed.data, updatedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return success(updated);
  } catch (err) {
    return serverError();
  }
}
