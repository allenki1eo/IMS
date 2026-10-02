import { NextRequest, NextResponse } from "next/server";
import { requireAuth, requirePermission, getRequestMeta } from "@/lib/api-helpers";
import { createAuditLog } from "@/lib/audit";
import { forbidden, badRequest, serverError } from "@/lib/response";
import { isSsoApp, signSsoHandoff, ssoCallbackUrl, SsoConfigError } from "@/lib/sso";

export const dynamic = "force-dynamic";

const HR_PERMISSION = "employees:employee:read";

/**
 * Launch a child app with a short-lived SSO handoff token.
 * GET /api/sso/launch?app=sales|hr
 *
 * Session auth is the existing IMS cookie (`erp_session`), validated by
 * middleware and `requireAuth` / `requirePermission`. Sales has no extra
 * permission. HR requires `employees:employee:read`.
 */
export async function GET(request: NextRequest) {
  const appParam = request.nextUrl.searchParams.get("app");
  if (!isSsoApp(appParam)) {
    return badRequest("app must be sales or hr");
  }
  const app = appParam;

  const auth =
    app === "hr"
      ? await requirePermission(request, HR_PERMISSION)
      : await requireAuth(request);
  if ("error" in auth) return auth.error;

  const { user } = auth;
  // requirePermission already blocks this for HR. Sales has no permission
  // gate, but a forced password change must still finish inside IMS first.
  if (user.mustChangePassword) {
    return forbidden("Please change your password before continuing");
  }

  try {
    const token = await signSsoHandoff({
      sub: user.id,
      email: user.email,
      username: user.username,
      name: user.fullName,
      aud: app,
    });
    const target = ssoCallbackUrl(app, token);

    const { ipAddress, userAgent } = getRequestMeta(request);
    await createAuditLog({
      userId: user.id,
      userName: user.username,
      action: "SSO_LAUNCH",
      module: "auth",
      resource: "sso",
      recordId: user.id,
      newValue: { app, aud: app },
      description: `Issued SSO handoff for ${app}`,
      ipAddress,
      userAgent,
    });

    const response = NextResponse.redirect(target, 302);
    response.headers.set("Cache-Control", "no-store, private");
    response.headers.set("Referrer-Policy", "no-referrer");
    return response;
  } catch (err) {
    if (err instanceof SsoConfigError) {
      console.error("[sso/launch] misconfigured");
      return serverError("SSO handoff is not configured");
    }
    console.error("[sso/launch] failed to issue handoff");
    return serverError();
  }
}
