import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const log: Prisma.LogLevel[] =
  process.env.NODE_ENV === "development"
    ? ["query", "error", "warn"]
    : ["error"];

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

  // Local SQLite: use standard datasource URL (no adapter needed)
  if (databaseUrl.startsWith("file:")) {
    return new PrismaClient({
      datasources: { db: { url: databaseUrl } },
      log,
    });
  }

  // Turso / libSQL remote: use driver adapter with config object
  const adapter = new PrismaLibSQL({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  return new PrismaClient({ adapter, log });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
