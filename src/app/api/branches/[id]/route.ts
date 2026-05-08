import { NextRequest } from "next/server";
import { getBranchById, updateBranch } from "@/modules/company/branches.service";
import { updateBranchSchema } from "@/modules/company/company.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "company:branch:read");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const branch = await getBranchById(id);
  if (!branch) return notFound("Branch not found");
  return success(branch);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "company:branch:update");
  if ("error" in auth) return auth.error;
  const { id } = await params;
  const body = await request.json();
  const parsed = updateBranchSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);
  const { ipAddress, userAgent } = getRequestMeta(request);
  try {
    const branch = await updateBranch({ id, data: parsed.data, updatedById: auth.user.id, userName: auth.user.fullName, ipAddress, userAgent });
    return success(branch);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Branch not found") return notFound(msg);
    return serverError();
  }
}
