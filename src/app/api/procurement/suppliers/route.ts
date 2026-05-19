import { NextRequest } from "next/server";
import { listSuppliers, createSupplier } from "@/modules/procurement/suppliers.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest, handleError } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:supplier:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const pagination = parsePagination(searchParams);
  const search = searchParams.get("search") ?? undefined;
  const status = searchParams.get("status") ?? undefined;

  try {
    const { data, meta } = await listSuppliers(companyId, {
      search,
      status,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });

    return paginated(data, buildMeta(meta.total, pagination));
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "procurement:supplier:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const { code, name, contactPerson, email, phone, address, taxNumber, paymentTerms } = body;
  if (!code || typeof code !== "string") return badRequest("code is required");
  if (!name || typeof name !== "string") return badRequest("name is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const supplier = await createSupplier(
      companyId,
      {
        code: code.toUpperCase(),
        name,
        contactPerson: contactPerson ?? null,
        email: email ?? null,
        phone: phone ?? null,
        address: address ?? null,
        taxNumber: taxNumber ?? null,
        paymentTerms: paymentTerms ?? null,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );
    return created(supplier);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg.toLowerCase().includes("unique")) return badRequest("Supplier code already exists");
    return handleError(err);
  }
}

