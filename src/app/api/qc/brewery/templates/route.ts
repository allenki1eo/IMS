import { NextRequest } from "next/server";
import { requirePermission, getCompanyId, getRequestMeta } from "@/lib/api-helpers";
import { badRequest, created, success, handleError } from "@/lib/response";
import {
  BREWERY_SAMPLE_POINTS,
  BREWERY_STANDARD_TEMPLATES,
  BREWERY_TEST_STAGES,
  BREWERY_TEST_TYPES,
  RELEASE_DECISIONS,
} from "@/modules/qc/brewery-qc";
import { addParameter, createStandard } from "@/modules/qc/standards.service";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:read");
  if ("error" in auth) return auth.error;

  return success({
    testTypes: BREWERY_TEST_TYPES,
    testStages: BREWERY_TEST_STAGES,
    samplePoints: BREWERY_SAMPLE_POINTS,
    releaseDecisions: RELEASE_DECISIONS,
    standardTemplates: BREWERY_STANDARD_TEMPLATES,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const template = BREWERY_STANDARD_TEMPLATES.find((item) => item.code === body.templateCode);
  if (!template) return badRequest("Template not found");

  const { ipAddress } = getRequestMeta(request);

  try {
    const standard = await createStandard(
      companyId,
      {
        code: template.code,
        name: template.name,
        description: template.description,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );

    for (const parameter of template.parameters) {
      await addParameter(companyId, standard.id, {
        ...parameter,
        isRequired: true,
      });
    }

    return created(standard);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "A standard with this code already exists") return badRequest(msg);
    return handleError(err);
  }
}
