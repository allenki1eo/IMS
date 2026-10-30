# Schema push — Data Center (periodic uploads)

Additive Prisma changes (safe for Turso `db push`). No existing table changes.

## DataRequirement (`data_requirements`) — new table
- What a company must upload on a schedule: `name`, `description?`, `category`, `frequency`
  (`ANNUAL` | `QUARTERLY` | `MONTHLY`), `dueMonth` (annual only), `dueDay`, `departmentId?`, `isActive`
- Indexes: `companyId`, `(companyId, isActive)`

## DataUpload (`data_uploads`) — new table
- File metadata: `title`, `category`, `periodYear`, `periodKey` (`2026` | `2026-Q1` | `2026-03`),
  `fileName`, `mimeType`, `sizeBytes`, `sha256`, `storage` (`DB` | `DISK`), `version`,
  `status` (`CURRENT` | `SUPERSEDED` | `ARCHIVED`), `uploadedById/Name`, optional `requirementId` → `data_requirements.id`
- Indexes: `(companyId, periodYear)`, `(requirementId, periodKey)`, `status`

## DataUploadBlob (`data_upload_blobs`) — new table
- `uploadId` (PK, cascade delete) + `content` BLOB — used only when storage is `DB`

## Storage
| Deployment | Storage | Limit |
|---|---|---|
| Vercel (`VERCEL` env set) | `DB` — bytes in `data_upload_blobs` | 4 MB (Vercel request-body cap) |
| Docker / Coolify / LAN with `UPLOAD_DIR` | `DISK` — `UPLOAD_DIR/data-center/<companyId>/<uploadId>` | `MAX_FILE_SIZE_MB` (default 10) |

Mount `UPLOAD_DIR` as a persistent volume (`/app/uploads`) on self-hosted deployments.

## Permissions (seed)
- `data:upload:read` — view/download · `data:upload:create` — upload · `data:upload:archive` — archive
- `data:requirement:manage` — define required submissions
- Granted: Company Admin (all), Director (read/create/manage), Branch Manager & Dept Head (read/create),
  Management & Auditor (read). Super Admin has `*`.

## PRODUCTION REQUIRED (P0)

Live Turso is **not** updated by this PR alone. After deploy, an operator with Turso credentials must run:

```bash
npx prisma generate
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="..." npx prisma db push
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="..." npm run db:seed   # adds the 4 permissions
```

Without the push, `/data-center` fails with `no such table: main.data_requirements`.
Without the seed, only Super Admin sees the module.

Do **not** invent credentials in CI/agents.

## How to use
1. Finance → **Data Center** (or ⌘K → "Upload a file")
2. **Requirements** → add e.g. *Annual budget* (Annual, due end of January) or *Excise return* (Monthly, due 7th)
3. Click any period chip in the yearly checklist to upload; click a submitted chip for versions/download
4. Re-uploading for a period creates v2 and keeps v1; archiving the current file restores the previous version

All uploads, downloads, archives, and requirement changes are written to the audit log.
