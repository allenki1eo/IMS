import { PrismaClient, type Prisma } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

const runtimeDatabaseUrl =
  process.env.SUPABASE_DATABASE_URL ||
  process.env.POSTGRES_PRISMA_URL ||
  process.env.POSTGRES_URL ||
  process.env.DIRECT_URL;

const hasPostgresProtocol = (value?: string) =>
  Boolean(value && /^postgres(?:ql)?:\/\//i.test(value));

if (!hasPostgresProtocol(process.env.DATABASE_URL) && hasPostgresProtocol(runtimeDatabaseUrl)) {
  process.env.DATABASE_URL = runtimeDatabaseUrl;
}

// Warn if using direct Supabase connection in production (bypasses pooler)
if (
  process.env.NODE_ENV === "production" &&
  process.env.DATABASE_URL?.includes(".supabase.co:5432")
) {
  console.warn(
    "DATABASE_URL is using the Supabase direct connection. Use the Transaction Pooler URL (port 6543) for production runtime and keep DIRECT_URL for migrations."
  );
}

// Only log errors in all environments — query logging adds significant overhead
const log: Prisma.LogLevel[] = ["error"];

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log,
    datasources: {
      db: {
        url: process.env.DATABASE_URL,
      },
    },
  });
}

export const db = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
