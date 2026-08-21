import { db } from "@/lib/db";
import { hashPassword, verifyPassword } from "@/lib/crypto";
import { signToken, signLongToken, getSessionExpiry } from "@/lib/auth";
import { createSession, invalidateAuthUser } from "@/lib/session";
import { createAuditLog } from "@/lib/audit";

export interface LoginParams {
  username: string;
  password: string;
  rememberMe?: boolean;
  ipAddress?: string;
  userAgent?: string;
}

export interface LoginResult {
  token: string;
  expiresAt: Date;
  userId: string;
  mustChangePassword: boolean;
}

export async function loginService(params: LoginParams): Promise<LoginResult> {
  const { username, password, rememberMe = false, ipAddress, userAgent } = params;
  const loginIdentifier = username.trim();

  // SQLite has no `mode: "insensitive"` — match case-insensitively via LIKE
  // (case-insensitive for ASCII in SQLite/libSQL), then verify exactly in JS.
  const candidates = await db.user.findMany({
    where: {
      OR: [{ username: { contains: loginIdentifier } }, { email: { contains: loginIdentifier } }],
    },
  });
  const lowered = loginIdentifier.toLowerCase();
  const user =
    candidates.find(
      (u) => u.username.toLowerCase() === lowered || u.email?.toLowerCase() === lowered
    ) ?? null;

  if (!user) {
    console.warn("[auth/login] User not found", { username: loginIdentifier });
    await createAuditLog({
      userName: loginIdentifier,
      action: "LOGIN_FAILED",
      module: "auth",
      resource: "session",
      description: `Failed login attempt for username: ${loginIdentifier}`,
      ipAddress,
      userAgent,
    });
    throw new Error("Invalid credentials");
  }

  if (!user.isActive) {
    await createAuditLog({
      userId: user.id,
      userName: user.fullName,
      action: "LOGIN_FAILED",
      module: "auth",
      resource: "session",
      description: "Login attempt on inactive account",
      ipAddress,
      userAgent,
    });
    throw new Error("Account is deactivated. Contact your administrator.");
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    console.warn("[auth/login] Invalid password", { userId: user.id, username: user.username });
    await createAuditLog({
      userId: user.id,
      userName: user.fullName,
      action: "LOGIN_FAILED",
      module: "auth",
      resource: "session",
      description: "Invalid password",
      ipAddress,
      userAgent,
    });
    throw new Error("Invalid credentials");
  }

  const token = rememberMe
    ? await signLongToken(user.id)
    : await signToken(user.id);

  // Extract jti from signed token by re-parsing
  const { jwtVerify } = await import("jose");
  const secret = new TextEncoder().encode(
    process.env.JWT_SECRET || "dev-secret-change-in-production"
  );
  const { payload } = await jwtVerify(token, secret);
  const jti = payload.jti as string;

  const expiresAt = getSessionExpiry(rememberMe);
  await createSession({ userId: user.id, jti, expiresAt, ipAddress, userAgent });

  await db.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createAuditLog({
    userId: user.id,
    userName: user.fullName,
    action: "LOGIN",
    module: "auth",
    resource: "session",
    description: "User logged in successfully",
    ipAddress,
    userAgent,
  });

  return { token, expiresAt, userId: user.id, mustChangePassword: user.mustChangePassword };
}

export async function changePasswordService(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
  ipAddress?: string;
  userAgent?: string;
  userName: string;
}): Promise<void> {
  const { userId, currentPassword, newPassword, ipAddress, userAgent, userName } = params;

  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) throw new Error("User not found");

  const valid = await verifyPassword(currentPassword, user.passwordHash);
  if (!valid) throw new Error("Current password is incorrect");

  if (newPassword.length < 8) throw new Error("Password must be at least 8 characters");
  const sameAsCurrent = await verifyPassword(newPassword, user.passwordHash);
  if (sameAsCurrent) {
    throw new Error("New password must be different from your current password");
  }

  const newHash = await hashPassword(newPassword);
  await db.user.update({
    where: { id: userId },
    data: {
      passwordHash: newHash,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    },
  });
  invalidateAuthUser(userId);

  await createAuditLog({
    userId,
    userName,
    action: "PASSWORD_CHANGE",
    module: "auth",
    resource: "user",
    recordId: userId,
    description: "User changed their password",
    ipAddress,
    userAgent,
  });
}
