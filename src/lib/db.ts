import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Only log errors in all environments — query logging adds significant overhead
const log: Prisma.LogLevel[] = ["error"];

/**
 * Prisma CLI resolves relative `file:` SQLite URLs against the schema directory
 * (`prisma/`). @libsql/client resolves them against `process.cwd()`. Without
 * normalizing, `DATABASE_URL=file:./dev.db` creates `prisma/dev.db` via
 * `prisma db push` but the app/seed talk to an empty `./dev.db` at the repo root.
 *
 * Avoid importing `node:fs` / `node:path` here — this module is transitively
 * imported by some dashboard pages and those Node builtins break the client bundle.
 */
function resolveDatabaseUrl(url: string): string {
  if (!url.startsWith("file:")) return url;

  const rawPath = url.slice("file:".length);
  // Absolute Unix (/...) or Windows (C:\...) paths — keep as-is
  if (rawPath.startsWith("/") || /^[A-Za-z]:[\\/]/.test(rawPath)) {
    return url;
  }

  const cwd = typeof process !== "undefined" && typeof process.cwd === "function"
    ? process.cwd()
    : ".";

  // Strip leading ./ or .\
  const relative = rawPath.replace(/^\.[\\/]/, "");
  // Match Prisma CLI: relative file URLs are schema-dir-relative (prisma/)
  const absolute = `${cwd}/prisma/${relative}`.replace(/\\/g, "/");
  return `file:${absolute}`;
}

function createPrismaClient(): PrismaClient {
  const rawUrl =
    process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";
  const url = resolveDatabaseUrl(rawUrl);

  if (url.startsWith("libsql:")) {
    // Turso / remote libSQL
    const adapter = new PrismaLibSQL({
      url,
      authToken: process.env.DATABASE_AUTH_TOKEN ?? process.env.TURSO_AUTH_TOKEN,
    });
    return new PrismaClient({ log, adapter });
  }

  // Local SQLite file (dev) or local sqld
  const adapter = new PrismaLibSQL({ url });
  return new PrismaClient({ log, adapter });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

globalForPrisma.prisma = globalForPrisma.prisma ?? db;
