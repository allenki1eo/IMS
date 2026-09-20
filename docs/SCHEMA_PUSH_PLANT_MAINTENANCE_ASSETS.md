# Schema push — Plant maintenance assets

Additive Prisma changes (safe for Turso `db push`).

## PlantAsset (`plant_assets`) — new table
- `id`, `companyId`, `branchId?`, `code`, `name`, `category`, `location?`, `notes?`
- `status` default `ACTIVE`, `isActive` default `true`
- `createdAt`, `updatedAt`, `createdById`
- Unique: `(companyId, code)`
- Indexes: `companyId`, `status`, `category`
- Categories (app-enforced): `STILL` | `TANK` | `FILLER` | `BOILER` | `OTHER`

## WorkOrder (`work_orders`) — additive
- `vehicleId` now **optional** (was required)
- New optional `plantAssetId` → `plant_assets.id`
- Index: `work_orders_plantAssetId_idx`
- Exactly one of `vehicleId` / `plantAssetId` enforced in application layer (not DB check)

Vehicle and PlantAsset remain **separate** types (no merge).

## PRODUCTION REQUIRED (P0)

Live Turso is **not** updated by this PR alone. After deploy, an operator with Turso credentials must run:

```bash
npx prisma generate
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="..." npx prisma db push
```

Without this push:
- Queries fail with `no such table: main.plant_assets`
- Creating plant WOs fails (missing `plantAssetId` column)

Do **not** invent credentials in CI/agents.

Optional seed (demo company plant assets):

```bash
DATABASE_URL="..." DATABASE_AUTH_TOKEN="..." npm run db:seed
```

Seeds: `STILL-01`, `ST-01`, `FILL-01`, `BOIL-01`, `TANK-02` for the demo company.

## How to use
1. Maintenance → Work Orders → New
2. Asset kind: **Vehicle** or **Plant equipment**
3. Pick a still/tank/filler (or vehicle) → create WO

Deferred: full CMMS, spare-parts BOM auto-issue, predictive maintenance, merging Vehicle into a generic Asset.
