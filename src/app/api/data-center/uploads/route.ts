import { NextRequest } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { paginated, created, badRequest } from "@/lib/response";
import { parsePagination, buildMeta } from "@/lib/pagination";
import { maxUploadBytes } from "@/lib/storage";
import { createUpload, listUploads } from "@/modules/data-center/data-center.service";
import { uploadMetaSchema } from "@/modules/data-center/data-center.validation";
import { ALLOWED_EXTENSIONS, extensionOf, formatBytes } from "@/modules/data-center/data-center.types";
import { actorFrom, dataCenterError } from "../_shared";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "data:upload:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const sp = new URL(request.url).searchParams;
  const pagination = parsePagination(sp);
  try {
    const year = Number(sp.get("year")) || undefined;
    const { data, total } = await listUploads(companyId, {
      year,
      category: sp.get("category") ?? undefined,
      requirementId: sp.get("requirementId") ?? undefined,
      status: sp.get("status") ?? undefined,
      search: sp.get("search") ?? undefined,
      page: pagination.page,
      pageSize: pagination.pageSize,
    });
    return paginated(data, buildMeta(total, pagination));
  } catch (err) {
    return dataCenterError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "data:upload:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return badRequest("Expected a multipart form upload");
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return badRequest("Choose a file to upload");
  if (file.size > maxUploadBytes()) {
    return badRequest(`File is too large (${formatBytes(file.size)}). The limit is ${formatBytes(maxUploadBytes())}.`);
  }
  if (!ALLOWED_EXTENSIONS.includes(extensionOf(file.name))) {
    return badRequest(`Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(", ")}`);
  }

  const field = (k: string) => {
    const v = form.get(k);
    return typeof v === "string" && v.trim() !== "" ? v : undefined;
  };

  try {
    const meta = uploadMetaSchema.parse({
      title: field("title") ?? file.name.replace(/\.[^.]+$/, ""),
      description: field("description"),
      category: field("category"),
      periodKey: field("periodKey"),
      requirementId: field("requirementId"),
      departmentId: field("departmentId"),
    });
    // Keep only the base name; browsers may send paths on some platforms.
    const name = file.name.split(/[\\/]/).pop()!.slice(0, 200);
    const upload = await createUpload(
      companyId,
      meta,
      { name, type: file.type, bytes: Buffer.from(await file.arrayBuffer()) },
      actorFrom(request, auth.user)
    );
    return created(upload);
  } catch (err) {
    return dataCenterError(err);
  }
}
