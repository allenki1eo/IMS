import { NextRequest } from "next/server";
import { getSetting, updateSetting, deleteSetting } from "@/modules/settings/settings.service";
import { requireAuth, requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, notFound, handleError } from "@/lib/response";
import { z } from "zod";

const schema = z.object({ value: z.string() });

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { key } = await params;

  try {
    const value = await getSetting(key);
    if (value === null) return notFound("Setting not found");
    return success({ key, value });
  } catch (err) {
    return handleError(err);
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { key } = await params;
  const body = await request.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success) return badRequest(parsed.error.errors[0].message);

  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    const setting = await updateSetting({
      key,
      value: parsed.data.value,
      companyId,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success(setting);
  } catch (err) {
    return handleError(err);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { key } = await params;
  const { ipAddress, userAgent } = getRequestMeta(request);

  try {
    await deleteSetting({
      key,
      companyId,
      updatedById: auth.user.id,
      userName: auth.user.fullName,
      ipAddress,
      userAgent,
    });
    return success({ deleted: true });
  } catch (err) {
    return handleError(err);
  }
}
