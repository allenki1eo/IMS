import { NextRequest } from "next/server";
import { listAllPermissions } from "@/modules/roles/roles.service";
import { requirePermission } from "@/lib/api-helpers";
import { success , serverError} from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requirePermission(request, "roles:role:read");
  if ("error" in auth) return auth.error;
  try {
    const permissions = await listAllPermissions();
    return success(permissions);
  } catch (err) {
    console.error("[API Error]", err);
    return serverError();
  }
}
