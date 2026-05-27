/**
 * Incremental migration script for the production Turso database.
 * Each step is idempotent — safe to run multiple times.
 *
 * Usage:
 *   DATABASE_URL="libsql://your-db.turso.io" \
 *   DATABASE_AUTH_TOKEN="your-token" \
 *   npx tsx scripts/migrate-prod.ts
 */

import { createClient } from "@libsql/client";

const TURSO_URL =
  process.env.DATABASE_URL || "libsql://erpims-hanki.aws-ap-northeast-1.turso.io";
const AUTH_TOKEN = process.env.DATABASE_AUTH_TOKEN ?? "";

if (!AUTH_TOKEN) {
  console.error("DATABASE_AUTH_TOKEN is required");
  process.exit(1);
}

const db = createClient({ url: TURSO_URL, authToken: AUTH_TOKEN });

// ─── helpers ──────────────────────────────────────────────────────────────────

async function tableExists(name: string): Promise<boolean> {
  const r = await db.execute({
    sql: "SELECT name FROM sqlite_master WHERE type='table' AND name=?",
    args: [name],
  });
  return r.rows.length > 0;
}

async function columnExists(table: string, column: string): Promise<boolean> {
  try {
    const r = await db.execute({ sql: `PRAGMA table_info("${table}")`, args: [] });
    return r.rows.some((row: any) => row.name === column);
  } catch {
    return false;
  }
}

let applied = 0;
let alreadyPresent = 0;

async function step(label: string, fn: () => Promise<void>) {
  try {
    await fn();
    console.log(`  ✓ ${label}`);
    applied++;
  } catch (err: any) {
    if (
      err.message?.includes("already exists") ||
      err.message?.includes("duplicate column")
    ) {
      console.log(`  - ${label} (already applied)`);
      alreadyPresent++;
    } else {
      console.error(`  ✗ ${label}\n    ${err.message}`);
      throw err;
    }
  }
}

async function addColumnIfMissing(
  table: string,
  column: string,
  definition: string,
  label?: string
) {
  const exists = await columnExists(table, column);
  const desc = label ?? `Add ${column} column to ${table}`;
  if (exists) {
    console.log(`  - ${desc} (already applied)`);
    alreadyPresent++;
  } else {
    await db.execute(`ALTER TABLE "${table}" ADD COLUMN ${column} ${definition}`);
    console.log(`  ✓ ${desc}`);
    applied++;
  }
}

async function createTableIfMissing(name: string, ddl: string, label?: string) {
  const exists = await tableExists(name);
  const desc = label ?? `Create ${name} table`;
  if (exists) {
    console.log(`  - ${desc} (already applied)`);
    alreadyPresent++;
  } else {
    await db.execute(ddl);
    console.log(`  ✓ ${desc}`);
    applied++;
  }
}

// ─── migrations ───────────────────────────────────────────────────────────────

async function run() {
  console.log(`Connecting to: ${TURSO_URL}\n`);

  // Vehicles: usageType column
  await addColumnIfMissing(
    "vehicles",
    "usageType",
    "TEXT NOT NULL DEFAULT 'COMMERCIAL'",
    "Add usageType column to vehicles"
  );

  // Warehouse: warehouseType column
  await addColumnIfMissing(
    "warehouses",
    "warehouseType",
    "TEXT NOT NULL DEFAULT 'MAIN'",
    "Add warehouseType column to warehouses"
  );

  // Exchange rates table (Phase 12)
  await createTableIfMissing(
    "exchange_rates",
    `CREATE TABLE "exchange_rates" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "companyId"     TEXT NOT NULL,
      "fromCurrency"  TEXT NOT NULL,
      "toCurrency"    TEXT NOT NULL,
      "rate"          REAL NOT NULL,
      "source"        TEXT NOT NULL DEFAULT 'MANUAL',
      "effectiveDate" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "notes"         TEXT,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdById"   TEXT NOT NULL,
      UNIQUE("companyId","fromCurrency","toCurrency","effectiveDate")
    )`,
    "Create exchange_rates table"
  );

  // Journal entries: currency columns (Phase 12)
  await addColumnIfMissing(
    "journal_entries",
    "currency",
    "TEXT NOT NULL DEFAULT 'TZS'",
    "Add currency column to journal_entries"
  );
  await addColumnIfMissing(
    "journal_entries",
    "exchangeRate",
    "REAL NOT NULL DEFAULT 1.0",
    "Add exchangeRate column to journal_entries"
  );

  // Journal entry lines: exchangeRate column
  await addColumnIfMissing(
    "journal_entry_lines",
    "exchangeRate",
    "REAL NOT NULL DEFAULT 1.0",
    "Add exchangeRate column to journal_entry_lines"
  );

  // Customers table (Phase 10 – Sales)
  await createTableIfMissing(
    "customers",
    `CREATE TABLE "customers" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "companyId"     TEXT NOT NULL,
      "externalId"    TEXT,
      "code"          TEXT NOT NULL,
      "name"          TEXT NOT NULL,
      "email"         TEXT,
      "phone"         TEXT,
      "address"       TEXT,
      "contactPerson" TEXT,
      "creditLimit"   REAL,
      "currency"      TEXT NOT NULL DEFAULT 'TZS',
      "status"        TEXT NOT NULL DEFAULT 'ACTIVE',
      "notes"         TEXT,
      "syncedAt"      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("companyId","code")
    )`
  );

  // Sales orders table
  await createTableIfMissing(
    "sales_orders",
    `CREATE TABLE "sales_orders" (
      "id"           TEXT NOT NULL PRIMARY KEY,
      "companyId"    TEXT NOT NULL,
      "externalId"   TEXT,
      "reference"    TEXT NOT NULL,
      "customerId"   TEXT NOT NULL,
      "status"       TEXT NOT NULL DEFAULT 'PENDING',
      "priority"     TEXT NOT NULL DEFAULT 'NORMAL',
      "orderDate"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "requiredDate" DATETIME,
      "subtotal"     REAL NOT NULL DEFAULT 0,
      "taxAmount"    REAL NOT NULL DEFAULT 0,
      "totalAmount"  REAL NOT NULL DEFAULT 0,
      "currency"     TEXT NOT NULL DEFAULT 'TZS',
      "notes"        TEXT,
      "dispatchRef"  TEXT,
      "syncedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("companyId","reference")
    )`
  );

  // Sales order lines table
  await createTableIfMissing(
    "sales_order_lines",
    `CREATE TABLE "sales_order_lines" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "orderId"     TEXT NOT NULL,
      "externalId"  TEXT,
      "productCode" TEXT NOT NULL,
      "description" TEXT NOT NULL,
      "quantity"    REAL NOT NULL,
      "unitPrice"   REAL NOT NULL,
      "discount"    REAL NOT NULL DEFAULT 0,
      "totalPrice"  REAL NOT NULL,
      "status"      TEXT NOT NULL DEFAULT 'PENDING',
      FOREIGN KEY ("orderId") REFERENCES "sales_orders"("id") ON DELETE CASCADE
    )`
  );

  // Sales KPIs table
  await createTableIfMissing(
    "sales_kpis",
    `CREATE TABLE "sales_kpis" (
      "id"        TEXT NOT NULL PRIMARY KEY,
      "companyId" TEXT NOT NULL,
      "period"    TEXT NOT NULL,
      "metric"    TEXT NOT NULL,
      "target"    REAL NOT NULL DEFAULT 0,
      "achieved"  REAL NOT NULL DEFAULT 0,
      "currency"  TEXT NOT NULL DEFAULT 'TZS',
      "syncedAt"  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("companyId","period","metric")
    )`
  );

  // Sales webhook logs table
  await createTableIfMissing(
    "sales_webhook_logs",
    `CREATE TABLE "sales_webhook_logs" (
      "id"          TEXT NOT NULL PRIMARY KEY,
      "companyId"   TEXT NOT NULL,
      "eventType"   TEXT NOT NULL,
      "externalId"  TEXT,
      "payload"     TEXT NOT NULL,
      "status"      TEXT NOT NULL DEFAULT 'OK',
      "error"       TEXT,
      "processedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`
  );

  // Daily truck movements table (Transport – vehicle usage reporting)
  await createTableIfMissing(
    "daily_truck_movements",
    `CREATE TABLE "daily_truck_movements" (
      "id"            TEXT NOT NULL PRIMARY KEY,
      "companyId"     TEXT NOT NULL,
      "reportDate"    DATETIME NOT NULL,
      "reference"     TEXT NOT NULL UNIQUE,
      "status"        TEXT NOT NULL DEFAULT 'DRAFT',
      "totalVehicles" INTEGER NOT NULL DEFAULT 0,
      "onTrip"        INTEGER NOT NULL DEFAULT 0,
      "present"       INTEGER NOT NULL DEFAULT 0,
      "maintenance"   INTEGER NOT NULL DEFAULT 0,
      "offsite"       INTEGER NOT NULL DEFAULT 0,
      "other"         INTEGER NOT NULL DEFAULT 0,
      "notes"         TEXT,
      "createdById"   TEXT NOT NULL,
      "submittedById" TEXT,
      "submittedAt"   DATETIME,
      "createdAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt"     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE("companyId","reportDate")
    )`
  );

  // Users: companyId column (Company Isolation)
  await addColumnIfMissing(
    "users",
    "companyId",
    "TEXT",
    "Add companyId column to users"
  );

  // Daily truck movement entries (vehicle usage lines)
  await createTableIfMissing(
    "daily_truck_movement_entries",
    `CREATE TABLE "daily_truck_movement_entries" (
      "id"             TEXT NOT NULL PRIMARY KEY,
      "reportId"       TEXT NOT NULL,
      "vehicleId"      TEXT NOT NULL,
      "driverId"       TEXT,
      "vehicleStatus"  TEXT NOT NULL DEFAULT 'PRESENT',
      "tripId"         TEXT,
      "destination"    TEXT,
      "departureTime"  DATETIME,
      "expectedReturn" DATETIME,
      "odometerOut"    REAL,
      "fuelLevel"      TEXT,
      "remarks"        TEXT,
      UNIQUE("reportId","vehicleId"),
      FOREIGN KEY ("reportId") REFERENCES "daily_truck_movements"("id") ON DELETE CASCADE
    )`,
    "Create daily_truck_movement_entries table (vehicle usage lines)"
  );

  console.log(`\nDone — ${applied} applied, ${alreadyPresent} already present.`);
  db.close();
}

run().catch((err) => {
  console.error("\n✗ Migration failed:", err.message);
  process.exit(1);
});
