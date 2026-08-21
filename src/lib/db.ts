import { PrismaClient, type Prisma } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

// Only log errors in all environments — query logging adds significant overhead
const log: Prisma.LogLevel[] = ["error"];

function createPrismaClient(): PrismaClient {
  const url = process.env.TURSO_DATABASE_URL || process.env.DATABASE_URL || "file:./dev.db";

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
