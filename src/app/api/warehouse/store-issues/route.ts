import { NextRequest } from "next/server";
import { listStoreIssues, createStoreIssue } from "@/modules/warehouse/store-issues.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:issue:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const paginationParams = parsePagination(searchParams);
  const issueType = searchParams.get("issueType") ?? undefined;
  const warehouseId = searchParams.get("warehouseId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom");
  const dateTo = searchParams.get("dateTo");

  try {
    const { issues, total } = await listStoreIssues({
      companyId,
      page: paginationParams.page,
      pageSize: paginationParams.pageSize,
      issueType,
      warehouseId,
      dateFrom: dateFrom ? new Date(dateFrom) : undefined,
      dateTo: dateTo ? new Date(`${dateTo}T23:59:59.999Z`) : undefined,
    });
    return paginated(issues, buildMeta(total, paginationParams));
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "warehouse:issue:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { warehouseId, issueType, issueDate, destination, notes, lines } = body;

  if (!warehouseId || typeof warehouseId !== "string") return badRequest("warehouseId is required");
  if (!issueType || typeof issueType !== "string") return badRequest("issueType is required");
  if (!issueDate) return badRequest("issueDate is required");
  if (!Array.isArray(lines) || lines.length === 0) return badRequest("At least one line is required");

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const issue = await createStoreIssue({
      companyId,
      warehouseId,
      issueType,
      issueDate: new Date(issueDate),
      destination: destination || undefined,
      notes: notes || undefined,
      lines: lines.map((l: any) => ({
        itemId: l.itemId,
        quantity: Number(l.quantity),
        notes: l.notes || undefined,
      })),
      createdById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(issue);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("Insufficient stock") || msg.includes("Invalid issue type") || msg.includes("greater than zero")) {
      return badRequest(msg);
    }
    return handleError(err);
  }
}
