import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, parseBody } from "@/lib/api-helpers";
import { getProductSpecById, updateProductSpec } from "@/modules/lab/lab.service";
import { success, notFound } from "@/lib/response";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "lab:spec:read");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const spec = await getProductSpecById(id);
  if (!spec) return notFound("Product spec not found");
  return success(spec);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requirePermission(request, "lab:spec:write");
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const { body, error } = await parseBody(request);
  if (error) return error;

  const { ipAddress, userAgent } = getRequestMeta(request);

  const spec = await updateProductSpec({
    id,
    data: body as any,
    updatedById: auth.user.id,
    userName: auth.user.fullName,
    ipAddress,
    userAgent,
  });

  return success(spec);
}
