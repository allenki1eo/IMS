import { NextRequest } from "next/server";
import { updateSetting } from "@/modules/settings/settings.service";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, badRequest, serverError } from "@/lib/response";
import { z } from "zod";

const schema = z.object({ value: z.string() });

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ key: string }> }
) {
  const auth = await requirePermission(request, "settings:settings:update");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId();
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
    const msg = err instanceof Error ? err.message : "Failed";
    return serverError();
  }
}
