# Schema push — Spirits QC templates

Additive Prisma field on `quality_standards` (safe for Turso `db push`).

## QualityStandard (`quality_standards`)
- `lineFamily` String `@default("BREWING")` — `BREWING` | `SPIRITS`
- Index: `quality_standards_lineFamily_idx`
- `isActive` default remains `false` (Active requires ≥1 parameter — see #128)

## PRODUCTION REQUIRED (P0)

Live Turso is **not** updated by this PR alone. After deploy, an operator with Turso credentials must run:

```bash
npx prisma generate
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="..." npx prisma db push
```

Without this push, queries fail with `no such column: main.lineFamily` on quality standards.
Do **not** invent credentials in CI/agents.

Optional seed (demo company):

```bash
DATABASE_URL="..." DATABASE_AUTH_TOKEN="..." npm run db:seed
```

Seeds Active brewery + spirits QC standards (≥1 parameter each). Methanol is optional on incoming/new-make only.

## What was seeded (codes)

**Spirits (`lineFamily=SPIRITS`):**
- `SPIRIT-INCOMING-GNS` — Incoming Spirit / GNS
- `SPIRIT-NEW-MAKE` — Post-Distill / New Make
- `SPIRIT-POST-BLEND` — Post-Blend / Proofing
- `SPIRIT-PRE-BOTTLE` — Pre-Bottle Release
- `SPIRIT-PACK-QC` — Packaging (Spirits)

**Brewery (unchanged templates, also seeded):** `BEER-FINISHED`, `WORT-QC`, `PACK-QC`, `MICRO-BEER`

No destructive renames/drops in this change set.
