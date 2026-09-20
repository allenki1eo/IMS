import { NextRequest } from "next/server";
import { requirePermission, getRequestMeta, getCompanyId } from "@/lib/api-helpers";
import { success, created, badRequest, handleError } from "@/lib/response";
import {
  listCoaTemplates,
  getCoaTemplatePreview,
  getCoaSetupStatus,
  applyCoaTemplate,
} from "@/modules/finance/coa-setup.service";

/** GET — templates + current CoA setup status for the company. */
export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "finance:account:read");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get("templateId");

  try {
    const status = await getCoaSetupStatus(companyId);

    if (templateId) {
      const preview = getCoaTemplatePreview(templateId);
      if (!preview) return badRequest("Template not found");
      return success({ status, template: preview });
    }

    return success({
      status,
      templates: listCoaTemplates(),
    });
  } catch (err) {
    return handleError(err);
  }
}

/** POST — apply a CoA template (idempotent if accounts already exist). */
export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "finance:account:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  let body: { templateId?: string; createBankStubs?: boolean };
  try {
    body = await request.json();
  } catch {
    return badRequest("Invalid JSON body");
  }

  if (!body.templateId) return badRequest("templateId is required");

  const { ipAddress } = getRequestMeta(request);

  try {
    const result = await applyCoaTemplate(
      companyId,
      body.templateId,
      { createBankStubs: body.createBankStubs !== false },
      auth.user.id,
      auth.user.fullName || auth.user.username,
      ipAddress
    );

    // Idempotent: already set up is a successful no-op (not an error).
    if (result.alreadySetUp) {
      return success(result);
    }

    return created(result);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to apply template";
    if (msg === "Template not found") return badRequest(msg);
    return handleError(err);
  }
}
