import { NextRequest } from "next/server";
import { getEmployeeById, updateEmployee } from "@/modules/employees/employees.service";
import { updateEmployeeSchema } from "@/modules/employees/employees.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound, serverError } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "employees:employee:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  try {
    const employee = await getEmployeeById(id);
    if (!employee) return notFound("Employee not found");

    return success(employee);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "employees:employee:update");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateEmployeeSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const employee = await updateEmployee({
      id,
      data: parsed.data,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(employee);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Employee not found") return notFound(msg);
    return serverError();
  }
}
