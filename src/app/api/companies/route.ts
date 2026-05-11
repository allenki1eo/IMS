import { NextRequest } from "next/server";
import { listCompanies } from "@/modules/company/company.service";
import { requireAuth } from "@/lib/api-helpers";
import { success } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;

  const companies = await listCompanies();
  return success(companies);
}
