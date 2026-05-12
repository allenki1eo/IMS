import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql/web";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const log: Prisma.LogLevel[] =
  process.env.DEBUG_PRISMA_QUERIES === "true"
    ? ["query", "error", "warn"]
    : ["error", "warn"];

function getDatabaseUrl(): string {
  return (
    process.env.DATABASE_URL ||
    process.env.TURSO_DATABASE_URL ||
    "file:./dev.db"
  );
}

function getDatabaseAuthToken(): string | undefined {
  return process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN;
}

function createPrismaClient(): PrismaClient {
  const databaseUrl = getDatabaseUrl();

  // Local SQLite: use standard datasource URL (no adapter needed)
  if (databaseUrl.startsWith("file:")) {
    return new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log,
    });
  }

  // Turso / libSQL remote: use the HTTP-based web adapter so Vercel
  // serverless builds do not depend on native libSQL binaries.
  const adapter = new PrismaLibSQL({
    url: databaseUrl,
    authToken: getDatabaseAuthToken(),
  });

  return new PrismaClient({ adapter, log });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
