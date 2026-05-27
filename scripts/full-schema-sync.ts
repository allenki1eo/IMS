/**
 * FULL SCHEMA SYNC — Production Turso (libSQL)
 *
 * This script:
 * 1. Generates a complete SQL migration from the Prisma schema
 * 2. Connects to your Turso production database
 * 3. Executes each CREATE TABLE / CREATE INDEX / ALTER TABLE safely
 * 4. Skips anything that already exists (no errors)
 * 5. Reports exactly what was created vs what was already there
 *
 * Run from YOUR local machine (where Turso is accessible):
 *   cd Desktop/IMS
 *   DATABASE_URL="libsql://erpims-hanki.aws-ap-northeast-1.turso.io" \
 *   DATABASE_AUTH_TOKEN="your-token" \
 *   npx tsx scripts/full-schema-sync.ts
 */

import { createClient } from "@libsql/client";
import { execSync } from "child_process";

const DATABASE_URL = process.env.DATABASE_URL;
const DATABASE_AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN;

if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL is required");
  console.error("   Example: libsql://your-db.turso.io");
  process.exit(1);
}

// ─── Step 1: Generate full schema SQL from Prisma ───────────────────────────
function generateSchemaSQL(): string {
  console.log("🔄 Generating schema SQL from Prisma...\n");
  try {
    const sql = execSync(
      `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script`,
      { encoding: "utf-8", cwd: process.cwd(), stdio: ["pipe", "pipe", "pipe"] }
    );
    return sql;
  } catch (err: any) {
    console.error("❌ Failed to generate schema SQL:");
    console.error(err.stderr || err.message);
    process.exit(1);
  }
}

// ─── Step 2: Split SQL into individual statements ───────────────────────────
function splitStatements(sql: string): { description: string; sql: string }[] {
  const lines = sql.split("\n");
  const statements: { description: string; sql: string }[] = [];
  let current: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Start of a new statement block
    if (trimmed.startsWith("-- ")) {
      if (current.length > 0) {
        const code = current
          .filter((l) => !l.trim().startsWith("--"))
          .join("\n")
          .trim();
        if (code) {
          statements.push({
            description: current[0].replace("--", "").trim(),
            sql: code,
          });
        }
        current = [];
      }
    }
    current.push(line);
  }

  // Push the last block
  if (current.length > 0) {
    const code = current
      .filter((l) => !l.trim().startsWith("--"))
      .join("\n")
      .trim();
    if (code) {
      statements.push({
        description: current[0].replace("--", "").trim(),
        sql: code,
      });
    }
  }

  return statements;
}

// ─── Step 3: Connect to Turso ───────────────────────────────────────────────
const client = createClient({
  url: DATABASE_URL,
  authToken: DATABASE_AUTH_TOKEN,
});

// ─── Step 4: Execute each statement safely ──────────────────────────────────
async function run() {
  console.log(`🔗 Connecting to: ${DATABASE_URL.slice(0, 45)}...\n`);

  const schemaSQL = generateSchemaSQL();
  const statements = splitStatements(schemaSQL);

  console.log(`📋 Found ${statements.length} schema statements to apply\n`);

  let created = 0;
  let existed = 0;
  let failed = 0;
  const failures: string[] = [];

  for (const stmt of statements) {
    try {
      await client.execute(stmt.sql);
      console.log(`  ✅  ${stmt.description}`);
      created++;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);

      if (/already exists|already present|Duplicate column|duplicate column/i.test(msg)) {
        console.log(`  ⏭️   ${stmt.description} (already exists)`);
        existed++;
      } else if (/no such table/i.test(msg)) {
        // Usually means an ALTER TABLE ran before its target table was created,
        // or a foreign key references a missing table. Log but don't crash.
        console.error(`  ⚠️   ${stmt.description}`);
        console.error(`      Missing dependency: ${msg.slice(0, 150)}`);
        failed++;
        failures.push(`${stmt.description}: ${msg.slice(0, 150)}`);
      } else {
        console.error(`  ❌  ${stmt.description}`);
        console.error(`      ${msg.slice(0, 200)}`);
        failed++;
        failures.push(`${stmt.description}: ${msg.slice(0, 200)}`);
      }
    }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  console.log(`\n${"=".repeat(60)}`);
  console.log("📊 SCHEMA SYNC RESULTS");
  console.log(`${"=".repeat(60)}`);
  console.log(`  ✅ Created:     ${created}`);
  console.log(`  ⏭️  Skipped:     ${existed}`);
  console.log(`  ❌ Failed:      ${failed}`);
  console.log(`${"=".repeat(60)}`);

  if (failures.length > 0) {
    console.log("\n⚠️  FAILURES (may need manual review):");
    for (const f of failures) {
      console.log(`   • ${f}`);
    }
  }

  if (failed === 0) {
    console.log("\n🎉 Production database is now fully synced with Prisma schema!");
  } else {
    console.log("\n⚠️  Some statements failed. Review the errors above.");
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error("\n💥 Unexpected error:", err);
  process.exit(1);
});
