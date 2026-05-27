import { db } from "./db";
import { hashToken } from "./crypto";
import { cache, cacheKey } from "./cache";
import type { AuthUser } from "@/types/auth";

export async function createSession(params: {
  userId: string;
  jti: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}): Promise<void> {
  const { userId, jti, expiresAt, ipAddress, userAgent } = params;

  // Enforce max sessions per user (default 5) — revoke oldest
  const MAX_SESSIONS = 5;
  const activeSessions = await db.session.findMany({
    where: { userId, isActive: true },
    orderBy: { createdAt: "asc" },
  });

  if (activeSessions.length >= MAX_SESSIONS) {
    const toRevoke = activeSessions.slice(0, activeSessions.length - MAX_SESSIONS + 1);
    await db.session.updateMany({
      where: { id: { in: toRevoke.map((s) => s.id) } },
      data: { isActive: false, revokedAt: new Date(), revokedReason: "max_sessions" },
    });
  }

  await db.session.create({
    data: {
      userId,
      tokenHash: hashToken(jti),
      expiresAt,
      ipAddress,
      userAgent,
    },
  });
}

export async function validateSession(jti: string): Promise<boolean> {
  const hash = hashToken(jti);

  // Check short-lived cache first to avoid a DB hit on every request
  const cached = cache.get<boolean>(cacheKey.session(hash));
  if (cached !== null) return cached;

  const session = await db.session.findUnique({
    where: { tokenHash: hash },
  });

  if (!session || !session.isActive) {
    cache.set(cacheKey.session(hash), false, 30_000);
    return false;
  }
  if (session.expiresAt < new Date()) {
    await db.session.update({
      where: { id: session.id },
      data: { isActive: false },
    });
    cache.set(cacheKey.session(hash), false, 30_000);
    return false;
  }

  // Update last activity (fire and forget)
  db.session
    .update({
      where: { id: session.id },
      data: { lastActivityAt: new Date() },
    })
    .catch(() => {});

  cache.set(cacheKey.session(hash), true, 30_000);
  return true;
}

export async function revokeSession(jti: string, reason = "logout"): Promise<void> {
  const hash = hashToken(jti);
  await db.session.updateMany({
    where: { tokenHash: hash },
    data: { isActive: false, revokedAt: new Date(), revokedReason: reason },
  });
  cache.invalidateExact(cacheKey.session(hash));
}

export async function revokeSessionById(sessionId: string, reason = "manual"): Promise<void> {
  const session = await db.session.findUnique({ where: { id: sessionId }, select: { tokenHash: true } });
  await db.session.update({
    where: { id: sessionId },
    data: { isActive: false, revokedAt: new Date(), revokedReason: reason },
  });
  if (session) cache.invalidateExact(cacheKey.session(session.tokenHash));
}

export async function revokeAllUserSessions(userId: string, reason = "force_logout"): Promise<void> {
  const sessions = await db.session.findMany({ where: { userId, isActive: true }, select: { tokenHash: true } });
  await db.session.updateMany({
    where: { userId, isActive: true },
    data: { isActive: false, revokedAt: new Date(), revokedReason: reason },
  });
  for (const s of sessions) cache.invalidateExact(cacheKey.session(s.tokenHash));
}

export async function getAuthUser(userId: string): Promise<AuthUser | null> {
  const user = await db.user.findUnique({
    where: { id: userId, isActive: true },
    include: {
      roles: {
        where: {
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: {
          role: {
            include: {
              permissions: {
                include: { permission: true },
              },
            },
          },
        },
      },
    },
    // companyId is selected via the top-level model fields
  });

  if (!user) return null;

  const permissions = new Set<string>();
  const roles: string[] = [];

  for (const userRole of user.roles) {
    roles.push(userRole.role.code);
    for (const rp of userRole.role.permissions) {
      const { module, resource, action } = rp.permission;
      permissions.add(`${module}:${resource}:${action}`);
    }
  }

  // System users and super admins get all permissions.
  // This also keeps the seeded admin usable if role assignment data is repaired separately.
  if (user.isSystemUser || roles.includes("SUPER_ADMIN")) {
    permissions.add("*");
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.fullName,
    avatarPath: user.avatarPath,
    isSystemUser: user.isSystemUser,
    mustChangePassword: user.mustChangePassword,
    companyId: user.companyId ?? null,
    roles,
    permissions: Array.from(permissions),
  };
}
