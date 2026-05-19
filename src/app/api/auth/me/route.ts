import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { listCompanies } from "@/modules/company/company.service";
import { success , handleError } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  try {
    const companies = await listCompanies();

    return success({ ...auth.user, companies });
  } catch (err) {
    console.error("[API Error]", err);
    return handleError(err);
  }
}
