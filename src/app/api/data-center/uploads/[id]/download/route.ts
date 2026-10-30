import { NextRequest, NextResponse } from "next/server";
import { requirePermission, getCompanyId } from "@/lib/api-helpers";
import { badRequest, notFound } from "@/lib/response";
import { getUploadContent } from "@/modules/data-center/data-center.service";
import { actorFrom, dataCenterError } from "../../../_shared";

/** RFC 6266 attachment header with an ASCII fallback and a UTF-8 name. */
function contentDisposition(fileName: string) {
  const ascii = fileName.replace(/[^\x20-\x7e]/g, "_").replace(/["\\]/g, "_");
  return `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requirePermission(request, "data:upload:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { id } = await params;
  try {
    const result = await getUploadContent(companyId, id, actorFrom(request, auth.user));
    if (!result) return notFound("Upload not found");
    if (!result.bytes) return notFound("The file content is missing from storage");

    return new NextResponse(new Uint8Array(result.bytes), {
      headers: {
        // Always download, never render inline: uploads are untrusted content.
        "Content-Type": "application/octet-stream",
        "Content-Disposition": contentDisposition(result.upload.fileName),
        "Content-Length": String(result.bytes.length),
        "X-Content-Type-Options": "nosniff",
        "Cache-Control": "private, no-store",
      },
    });
  } catch (err) {
    return dataCenterError(err);
  }
}
