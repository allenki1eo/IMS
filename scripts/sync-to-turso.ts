/**
 * Sync local SQLite database to Turso
 *
 * Usage:
 *   DATABASE_AUTH_TOKEN="your-token" npx tsx scripts/sync-to-turso.ts
 *
 * Or set DATABASE_URL and DATABASE_AUTH_TOKEN in your environment.
 */

import { createClient, Client } from "@libsql/client";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────

const LOCAL_DB_URL = "file:./prisma/dev.db";
const TURSO_URL =
  process.env.DATABASE_URL || "libsql://erpims-hanki.aws-ap-northeast-1.turso.io";

function getAuthToken(): string {
  if (process.env.DATABASE_AUTH_TOKEN) {
    return process.env.DATABASE_AUTH_TOKEN;
  }

  // Try to read from .env.local
  const envLocalPath = path.resolve(".env.local");
  const envPath = path.resolve(".env");

  for (const p of [envLocalPath, envPath]) {
    if (fs.existsSync(p)) {
      const content = fs.readFileSync(p, "utf-8");
      const match = content.match(/DATABASE_AUTH_TOKEN=["']?([^"'\r\n]+)["']?/);
      if (match) return match[1];
    }
  }

  throw new Error(
    "DATABASE_AUTH_TOKEN not found. Set it as an environment variable or in .env.local"
  );
}

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

function chunk<T>(arr: T[], size: number): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    result.push(arr.slice(i, i + size));
  }
  return result;
}

// ─────────────────────────────────────────────
// SYNC LOGIC
// ─────────────────────────────────────────────

async function sync() {
  const authToken = getAuthToken();

  console.log("Connecting to local SQLite...");
  const local = createClient({ url: LOCAL_DB_URL });

  console.log("Connecting to Turso...");
  const turso = createClient({ url: TURSO_URL, authToken });

  // 1. Fetch schema from local DB (tables first, then indexes/triggers)
  console.log("\nReading local schema...");
  const schemaResult = await local.execute(
    `SELECT type, name, sql FROM sqlite_master
     WHERE sql IS NOT NULL
       AND type IN ('table', 'index', 'trigger')
       AND name NOT LIKE 'sqlite_%'
     ORDER BY
       CASE type WHEN 'table' THEN 1 WHEN 'index' THEN 2 ELSE 3 END,
       name`
  );

  const schemaRows = schemaResult.rows as unknown as Array<{
    type: string;
    name: string;
    sql: string;
  }>;

  // Filter out Prisma's internal migration table if it exists
  const schemaStatements = schemaRows
    .filter((r) => r.name !== "_prisma_migrations")
    .map((r) => r.sql);

  console.log(`Found ${schemaStatements.length} schema objects`);

  // 2. Prepare Turso: disable FK checks and wipe existing data if any
  console.log("\nPreparing Turso database...");
  await turso.execute("PRAGMA foreign_keys = OFF");

  // Drop existing tables (reverse order to handle FKs)
  const existingTables = await turso.execute(
    `SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'`
  );
  const tableNames = (existingTables.rows as unknown as Array<{ name: string }>).map(
    (r) => r.name
  );
  for (const name of tableNames.reverse()) {
    try {
      await turso.execute(`DROP TABLE IF EXISTS "${name}"`);
    } catch {
      // ignore
    }
  }

  // 3. Create schema on Turso
  console.log("Creating schema on Turso...");
  for (const sql of schemaStatements) {
    try {
      await turso.execute(sql);
    } catch (err: any) {
      console.warn(`Schema warning: ${err.message}\nSQL: ${sql.slice(0, 80)}...`);
    }
  }

  // 4. Fetch table names for data sync
  const tablesResult = await local.execute(
    `SELECT name FROM sqlite_master
     WHERE type='table'
       AND name NOT LIKE 'sqlite_%'
       AND name != '_prisma_migrations'
     ORDER BY name`
  );

  const tables = (tablesResult.rows as unknown as Array<{ name: string }>).map(
    (r) => r.name
  );

  // 5. Sync data table by table
  console.log("\nSyncing data...");
  let totalRows = 0;

  for (const tableName of tables) {
    const dataResult = await local.execute(`SELECT * FROM "${tableName}"`);
    const rows = dataResult.rows as Record<string, any>[];
    const columns = dataResult.columns;

    if (rows.length === 0) {
      console.log(`  ${tableName}: 0 rows`);
      continue;
    }

    const placeholders = columns.map(() => "?").join(", ");
    const insertSql = `INSERT INTO "${tableName}" (${columns
      .map((c) => `"${c}"`)
      .join(", ")}) VALUES (${placeholders})`;

    // Build batch statements (Turso handles ~100-500 per batch well)
    const statements = rows.map((row) => ({
      sql: insertSql,
      args: columns.map((col) => {
        const val = row[col];
        if (val === undefined) return null;
        // libSQL handles booleans/numbers/dates naturally
        return val;
      }),
    }));

    const batches = chunk(statements, 200);
    for (const batch of batches) {
      await turso.batch(batch);
    }

    totalRows += rows.length;
    console.log(`  ${tableName}: ${rows.length} rows`);
  }

  // 6. Re-enable FK checks
  await turso.execute("PRAGMA foreign_keys = ON");

  console.log(`\n✅ Sync complete! ${tables.length} tables, ${totalRows} total rows.`);

  // Cleanup
  local.close();
  turso.close();
}

sync().catch((err) => {
  console.error("\n❌ Sync failed:", err.message);
  process.exit(1);
});
