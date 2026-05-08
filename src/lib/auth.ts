import { SignJWT, jwtVerify } from "jose";
import { nanoid } from "nanoid";
import { cookies } from "next/headers";
import type { JWTPayload } from "@/types/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "dev-secret-change-in-production"
);

const COOKIE_NAME = "erp_session";
const DEFAULT_SESSION_MINUTES = 480; // 8 hours

export async function signToken(userId: string): Promise<string> {
  const jti = nanoid();
  return new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${DEFAULT_SESSION_MINUTES}m`)
    .sign(JWT_SECRET);
}

export async function signLongToken(userId: string): Promise<string> {
  const jti = nanoid();
  return new SignJWT({ sub: userId, jti })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .sign(JWT_SECRET);
}

export async function verifyToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return {
      sub: payload.sub as string,
      jti: payload.jti as string,
      iat: payload.iat as number,
      exp: payload.exp as number,
    };
  } catch {
    return null;
  }
}

export async function getSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

export function getSessionExpiry(rememberMe: boolean): Date {
  const ms = rememberMe
    ? 30 * 24 * 60 * 60 * 1000
    : DEFAULT_SESSION_MINUTES * 60 * 1000;
  return new Date(Date.now() + ms);
}

export const COOKIE_NAME_EXPORT = COOKIE_NAME;
