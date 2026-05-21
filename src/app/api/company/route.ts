import { NextRequest } from "next/server";
import { getCompanyById, updateCompany, createCompany } from "@/modules/company/company.service";
import { updateCompanySchema, createCompanySchema } from "@/modules/company/company.validation";
import { requirePermission, requireAuth, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError, created } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return notFound("Company not configured");

  try {
    const company = await getCompanyById(companyId);
    if (!company) return notFound("Company not found");

    return success(company);
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "company:company:create");
  if ("error" in auth) return auth.error;

  const body = await request.json();
  const parsed = createCompanySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const company = await createCompany({
      data: parsed.data,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(company);
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, "company:company:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return notFound("Company not configured");

  const body = await request.json();
  const parsed = updateCompanySchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  // Convert empty strings to null for optional fields
  const data = {
    ...parsed.data,
    email: parsed.data.email === "" ? null : parsed.data.email,
    website: parsed.data.website === "" ? null : parsed.data.website,
  };

  try {
    const updated = await updateCompany({
      id: companyId,
      data,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(updated);
  } catch (err) {
    return handleError(err);
  }
}
