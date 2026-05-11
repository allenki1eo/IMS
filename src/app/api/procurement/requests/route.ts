import { NextRequest } from "next/server";
import { listPurchaseRequests, createPurchaseRequest } from "@/modules/procurement/requests.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

type RequestLineBody = {
  itemId?: string | null;
  itemCode?: string | null;
  description: string;
  quantity: number | string;
  uom?: string;
  estimatedUnitCost?: number | string | null;
};

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:request:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;
  const priority = searchParams.get("priority") ?? undefined;

  const { data, meta } = await listPurchaseRequests(companyId, {
    search,
    status,
    priority,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:request:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { departmentId, purpose, priority, neededBy, notes, lines } = body;
  if (!purpose || typeof purpose !== "string") return badRequest("purpose is required");
  if (!Array.isArray(lines) || lines.length === 0) return badRequest("At least one line is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const purchaseRequest = await createPurchaseRequest(
      companyId,
      {
        departmentId: departmentId ?? null,
        purpose,
        priority: priority ?? "NORMAL",
        neededBy: neededBy ?? null,
        notes: notes ?? null,
        lines: lines.map((line: RequestLineBody) => ({
          itemId: line.itemId ?? null,
          itemCode: line.itemCode ?? null,
          description: line.description,
          quantity: Number(line.quantity),
          uom: line.uom ?? "PCS",
          estimatedUnitCost:
            line.estimatedUnitCost == null || line.estimatedUnitCost === ""
              ? null
              : Number(line.estimatedUnitCost),
        })),
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(purchaseRequest);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.includes("line")) return badRequest(msg);
    return serverError();
  }
}
