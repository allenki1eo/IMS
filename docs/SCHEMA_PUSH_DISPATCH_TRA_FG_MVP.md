# Schema push — Dispatch + TRA + FG MVP

Additive Prisma fields (safe for Turso `db push`). New columns have defaults where needed so existing rows remain valid.

## FGProduct (`fg_products`)
- `lineFamily` String `@default("BREWING")`
- `abvPct` Float?
- `packSize` Float?
- `packUom` String?
- `unitsPerCase` Int?
- `requiresTraStamp` Boolean `@default(false)`
- `traStampType` String?
- `defaultWarehouseId` String? (FK → warehouses)

## FGLot (`fg_lots`)
- `productionBatchId` String? (FK → production_batches)
- `abvPct` Float?
- `qaStatus` String `@default("PENDING")`
- `qaReleasedAt` DateTime?
- `qaReleasedById` String?
- `lotNumber` / `warehouseId` remain nullable in DB for legacy rows; **API receive requires both**

## TraStampActivation (`tra_stamp_activations`)
- `fgProductId` String? (required by API on create)
- `fgLotId` String? (required by API on create)
- `dispatchOrderId` String? (optional)

## Deploy (Turso / local)

```bash
npx prisma generate
DATABASE_URL="..." DATABASE_AUTH_TOKEN="..." npx prisma db push
```

No destructive renames/drops in this change set.

## Reports tab note (health pass)

`getDispatchReport` uses narrow `select` (product name/code + lot ids only) so the
Reports → Dispatch tab does **not** require the new FG columns to load.
Dispatch / TRA / FG **module** screens still need the columns above — run
`prisma db push` before exercising receive / QA release / TRA activation / DISPATCHED.
