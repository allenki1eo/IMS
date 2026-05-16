import { NextRequest } from "next/server";
import { listBranches, createBranch } from "@/modules/company/branches.service";
import { createBranchSchema } from "@/modules/company/company.validation";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, conflict, serverError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "company:branch:read");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");
  const { searchParams } = new URL(request.url);
  try {
    const branches = await listBranches({
      companyId,
      search: searchParams.get("search") ?? undefined,
      status: searchParams.get("status") ?? undefined,
    });
    return success(branches);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "company:branch:create");
  if ("error" in auth) return auth.error;
  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");
  const body = await request.json();
  const parsed = createBranchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    const branch = await createBranch({ ...parsed.data, companyId, createdById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return created(branch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint")) return conflict("Branch code already exists");
    return serverError();
  }
}
