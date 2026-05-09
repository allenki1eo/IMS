import { NextRequest } from "next/server";
import { listTests, createTest } from "@/modules/qc/tests.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, serverError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "qc:test:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const standardId = searchParams.get("standardId") ?? undefined;
  const itemId = searchParams.get("itemId") ?? undefined;
  const testType = searchParams.get("testType") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  const { data, meta } = await listTests(companyId, {
    standardId,
    itemId,
    testType,
    status,
    page: pagination.page,
    pageSize: pagination.pageSize,
  });

  return paginated(data, buildMeta(meta.total, pagination));
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "qc:test:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { standardId, itemId, batchNumber, testType, notes, sampleQty, sampleUnit } = body;

  if (!testType || typeof testType !== "string") return badRequest("testType is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const test = await createTest(
      companyId,
      {
        standardId: standardId ?? null,
        itemId: itemId ?? null,
        batchNumber: batchNumber ?? null,
        testType,
        notes: notes ?? null,
        sampleQty: sampleQty ?? null,
        sampleUnit: sampleUnit ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(test);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "Quality standard not found" || msg === "Item not found") return badRequest(msg);
    return serverError();
  }
}
