import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";
import { createClient } from "@libsql/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

function createPrismaClient(): PrismaClient {
  const databaseUrl = process.env.DATABASE_URL || "file:./dev.db";

  // Local SQLite: use standard PrismaClient
  if (databaseUrl.startsWith("file:")) {
    return new PrismaClient({
      datasources: {
        db: { url: databaseUrl },
      },
      log:
        process.env.NODE_ENV === "development"
          ? ["query", "error", "warn"]
          : ["error"],
    });
  }

  // Turso / libSQL: use driver adapter
  const client = createClient({
    url: databaseUrl,
    authToken: process.env.DATABASE_AUTH_TOKEN,
  });

  const adapter = new PrismaLibSQL(client);

  return new PrismaClient({
    adapter,
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
