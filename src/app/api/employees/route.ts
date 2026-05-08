import { NextRequest } from "next/server";
import { listEmployees, createEmployee } from "@/modules/employees/employees.service";
import { createEmployeeSchema } from "@/modules/employees/employees.validation";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, paginated, badRequest, conflict, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "employees:employee:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const params = parsePagination(searchParams);

  const isDriverParam = searchParams.get("isDriver");
  const isDriver =
    isDriverParam === "true" ? true : isDriverParam === "false" ? false : undefined;

  const { employees, total } = await listEmployees({
    companyId,
    ...params,
    search: searchParams.get("search") ?? undefined,
    status: searchParams.get("status") ?? undefined,
    branchId: searchParams.get("branchId") ?? undefined,
    departmentId: searchParams.get("departmentId") ?? undefined,
    isDriver,
  });

  return paginated(employees, buildMeta(total, params));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "employees:employee:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const parsed = createEmployeeSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const employee = await createEmployee({
      ...parsed.data,
      companyId,
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(employee);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Unique constraint") || msg.includes("unique")) {
      return conflict("Employee number already exists");
    }
    return serverError();
  }
}
