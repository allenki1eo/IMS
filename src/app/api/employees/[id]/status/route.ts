import { NextRequest } from "next/server";
import { setEmployeeStatus } from "@/modules/employees/employees.service";
import { updateStatusSchema } from "@/modules/employees/employees.validation";
import { requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { success, badRequest, notFound } from "@/lib/response";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "employees:employee:deactivate");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const body = await request.json();
  const parsed = updateStatusSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await setEmployeeStatus({
      id,
      status: parsed.data.status,
      terminationDate: parsed.data.terminationDate
        ? new Date(parsed.data.terminationDate)
        : undefined,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ message: `Employee status updated to ${parsed.data.status}` });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Employee not found") return notFound(msg);
    return badRequest(msg);
  }
}
