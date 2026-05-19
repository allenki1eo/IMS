import { NextRequest } from "next/server";
import { getSettings, bulkUpdateSettings, createSetting } from "@/modules/settings/settings.service";
import { requireAuth, requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";
import { z } from "zod";

const bulkUpdateSchema = z.array(
  z.object({
    key: z.string().min(1),
    value: z.string(),
  })
);

const createSchema = z.object({
  key: z.string().min(1, "Key is required").regex(/^[a-z0-9_]+$/, "Key must be lowercase letters, numbers, and underscores only"),
  value: z.string(),
  category: z.string().min(1, "Category is required"),
  description: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  try {
    const settings = await getSettings({
      companyId,
      category: searchParams.get("category") ?? undefined,
    });
    return success(settings);
  } catch (err) {
    return handleError(err);
  }
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const setting = await createSetting({
      ...parsed.data,
      companyId,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return created(setting);
  } catch (err) {
    return handleError(err);
  }
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
    return handleError(err);
  }
}
