# Schema push — Finance SMS alerts

Additive Prisma tables (safe for Turso `db push`).

## `finance_notification_settings`
- `scopeKey` — companyId for DEPOSIT; `"global"` for EOD_SPEND
- `alertType` — `DEPOSIT` | `EOD_SPEND`
- `enabled` (default false), `skipIfZero` (default true, EOD)
- Unique `(scopeKey, alertType)`

## `finance_sms_recipients`
- `settingId`, `phone`, `label?`, `isActive`, `sortOrder`
- Cascade delete with setting

## `finance_sms_logs`
- Audit + idempotency: unique `idempotencyKey`
- `status`: SENT | FAILED | SKIPPED
- `providerMsgId?`, `errorMessage?`

## PRODUCTION REQUIRED (P0)

```bash
npx prisma generate
DATABASE_URL="libsql://YOUR-DB.turso.io" DATABASE_AUTH_TOKEN="..." npx prisma db push
```

Without this push, finance SMS settings/logs queries fail (missing tables).

Do **not** invent credentials in CI/agents.
