import { NextRequest } from "next/server";
import { getSettings, bulkUpdateSettings } from "@/modules/settings/settings.service";
import { requireAuth, requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";
import { z } from "zod";

const bulkUpdateSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
  })
);

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const settings = await getSettings({
    companyId,
    category: searchParams.get("category") ?? undefined,
  });

  return success(settings);
}

export async function PUT(request: NextRequest) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const parsed = bulkUpdateSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const results = await bulkUpdateSettings({
      settings: parsed.data,
      companyId,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(results);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    return serverError();
  }
}
