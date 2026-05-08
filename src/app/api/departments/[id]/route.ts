import { NextRequest } from "next/server";
import { getDepartmentById, updateDepartment } from "@/modules/company/departments.service";
import { updateDepartmentSchema } from "@/modules/company/company.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "company:department:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const department = await getDepartmentById(id);
  if (!department) return notFound("Department not found");

  return success(department);
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "company:department:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateDepartmentSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const department = await updateDepartment({
      id,
      data: parsed.data,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(department);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Department not found") return notFound(msg);
    return serverError();
  }
}
