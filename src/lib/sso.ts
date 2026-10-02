import { SignJWT } from "jose";
import { nanoid } from "nanoid";

/** Child apps that IMS can launch. Matches `aud` on the handoff JWT. */
export const SSO_APPS = ["sales", "hr"] as const;
export type SsoApp = (typeof SSO_APPS)[number];

/** Handoff lifetime. Short enough to limit replay; long enough for one redirect. */
export const SSO_HANDOFF_TTL_SECONDS = 90;

const DEFAULT_APP_URLS: Record<SsoApp, string> = {
  sales: "https://sales.eastafricanspirit.co.tz",
  hr: "https://atwork.eastafricanspirit.co.tz",
};

const MIN_SECRET_LENGTH = 32;

export class SsoConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SsoConfigError";
  }
}

export function isSsoApp(value: string | null): value is SsoApp {
  return value === "sales" || value === "hr";
}

function appUrlEnv(app: SsoApp): string | undefined {
  return app === "sales" ? process.env.SALES_APP_URL : process.env.HR_APP_URL;
}

/**
 * Base URL of a child app. Env overrides the production default.
 * Only http(s) origins are accepted so a bad value cannot become an open redirect.
 */
export function resolveSsoAppBaseUrl(app: SsoApp): string {
  const raw = appUrlEnv(app)?.trim() || DEFAULT_APP_URLS[app];
  let parsed: URL;
  try {
    parsed = new URL(raw);
  } catch {
    throw new SsoConfigError(`Invalid ${app} app URL`);
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    throw new SsoConfigError(`Invalid ${app} app URL`);
  }
  if (parsed.username || parsed.password) {
    throw new SsoConfigError(`Invalid ${app} app URL`);
  }
  return raw.replace(/\/+$/, "");
}

export function ssoCallbackUrl(app: SsoApp, token: string): string {
  const callback = new URL(`${resolveSsoAppBaseUrl(app)}/api/sso/callback`);
  callback.searchParams.set("token", token);
  return callback.toString();
}

function sharedSecretKey(): Uint8Array {
  const secret = process.env.SSO_SHARED_SECRET?.trim() ?? "";
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new SsoConfigError("SSO_SHARED_SECRET is not configured");
  }
  return new TextEncoder().encode(secret);
}

export interface SsoHandoffClaims {
  sub: string;
  email: string;
  username: string;
  name: string;
  aud: SsoApp;
}

/**
 * Sign a one-time handoff JWT (HS256).
 * Claims are identity only — never a password, hash, or session cookie.
 * `jti` is unique per launch so the child app can reject replay.
 */
export async function signSsoHandoff(claims: SsoHandoffClaims): Promise<string> {
  return new SignJWT({
    email: claims.email,
    username: claims.username,
    name: claims.name,
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sub)
    .setAudience(claims.aud)
    .setJti(nanoid())
    .setIssuedAt()
    .setExpirationTime(`${SSO_HANDOFF_TTL_SECONDS}s`)
    .sign(sharedSecretKey());
}
