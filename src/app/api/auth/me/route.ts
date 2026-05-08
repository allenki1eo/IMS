import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/api-helpers";
import { success } from "@/lib/response";

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if ("error" in auth) return auth.error;
  return success(auth.user);
}
