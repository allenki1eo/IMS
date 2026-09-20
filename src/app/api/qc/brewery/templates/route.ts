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
import {
  SPIRITS_SAMPLE_POINTS,
  SPIRITS_STANDARD_TEMPLATES,
  SPIRITS_TEST_STAGES,
  SPIRITS_TEST_TYPES,
} from "@/modules/qc/spirits-qc";
import { addParameter, createStandard, updateStandard } from "@/modules/qc/standards.service";

const ALL_STANDARD_TEMPLATES = [...BREWERY_STANDARD_TEMPLATES, ...SPIRITS_STANDARD_TEMPLATES];

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:read");
  if ("error" in auth) return auth.error;

  const byValue = <T extends { value: string }>(items: readonly T[]) => {
    const seen = new Set<string>();
    return items.filter((item) => {
      if (seen.has(item.value)) return false;
      seen.add(item.value);
      return true;
    });
  };

  return success({
    testTypes: byValue([...BREWERY_TEST_TYPES, ...SPIRITS_TEST_TYPES]),
    testStages: byValue([...BREWERY_TEST_STAGES, ...SPIRITS_TEST_STAGES]),
    samplePoints: byValue([...BREWERY_SAMPLE_POINTS, ...SPIRITS_SAMPLE_POINTS]),
    releaseDecisions: RELEASE_DECISIONS,
    standardTemplates: ALL_STANDARD_TEMPLATES,
    breweryStandardTemplates: BREWERY_STANDARD_TEMPLATES,
    spiritsStandardTemplates: SPIRITS_STANDARD_TEMPLATES,
  });
}

export async function POST(request: NextRequest) {
  const auth = await requirePermission(request, "qc:standard:create");
  if ("error" in auth) return auth.error;

  const companyId = await getCompanyId(request);
  if (!companyId) return badRequest("Company not configured");

  const body = await request.json();
  const template = ALL_STANDARD_TEMPLATES.find((item) => item.code === body.templateCode);
  if (!template) return badRequest("Template not found");

  const { ipAddress } = getRequestMeta(request);

  try {
    const standard = await createStandard(
      companyId,
      {
        code: template.code,
        name: template.name,
        description: template.description,
        lineFamily: template.lineFamily,
      },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );

    for (const parameter of template.parameters) {
      await addParameter(companyId, standard.id, {
        name: parameter.name,
        unit: parameter.unit,
        minValue: parameter.minValue,
        maxValue: parameter.maxValue,
        targetValue: parameter.targetValue,
        sortOrder: parameter.sortOrder,
        isRequired: "isRequired" in parameter && parameter.isRequired === false ? false : true,
      });
    }

    // Templates include parameters — activate once they are in place.
    const activated = await updateStandard(
      companyId,
      standard.id,
      { isActive: true },
      auth.user.id,
      auth.user.fullName,
      ipAddress
    );

    return created(activated);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed";
    if (msg === "A standard with this code already exists") return badRequest(msg);
    return handleError(err);
  }
}
