# Finance SMS alerts

Implements `docs/PRODUCT_BRIEF_FINANCE_SMS.md`.

## What ships

1. **Deposit SMS** — when money-in is posted, notify configured phones (amount, account, company, time EAT).
2. **EOD spend SMS** — daily cron; one combined all-companies rollup to the director list; skip if zero (default).
3. **Settings UI** — Settings → Finance SMS (recipients + enable toggles). No director portal.

## Deposit trigger (wiring)

Primary path: **Cashbook `RECEIPT`** (`createCashbookEntry`).

Also: **Bank transaction `DEPOSIT`** (`createBankTransaction`).

Both call `notifyDepositPosted` with an idempotency key per `sourceType:sourceId:phone` so refresh/retry does not spam. Re-alert on amount edit is deferred.

## EOD spend definition (MVP)

For each active company, for the EAT calendar day:

- Sum **cashbook `PAYMENT`** amounts
- Plus **bank `WITHDRAWAL`** amounts
- **Exclude** cashbook/bank `TRANSFER` (internal moves)

Deposits are not included (they have their own alert). If the same outflow is recorded in both cashbook and bank txn, totals may double-count until ops standardize on one path — prefer cashbook.

## Swala SMS

Provider: [SwalaSMS](https://swalasms.com) (`POST /api/v1/sms/messages`, Bearer token, optional `Idempotency-Key`).

Env (see `.env.example`):

| Variable | Purpose |
|----------|---------|
| `SWALA_SMS_API_KEY` | API key (sandbox or live) |
| `SWALA_SMS_SENDER_ID` | Approved sender ID |
| `SWALA_SMS_BASE_URL` | Optional; default `https://swalasms.com/api/v1` |
| `CRON_SECRET` | Protects `/api/cron/finance-eod-sms` |
| `FINANCE_EOD_SMS_HOUR_START` / `_END` | EAT hour window (default 18–20) |

Configure recipients in **Settings → Finance SMS** (not env).

## Cron

- Route: `GET|POST /api/cron/finance-eod-sms`
- Auth: `Authorization: Bearer $CRON_SECRET` or `?secret=`
- `vercel.json` schedules `0 15 * * *` (15:00 UTC = **18:00 EAT**)
- Window gate uses EAT hours; pass `?force=1` for manual ops (also bypasses skip-if-zero / disabled when forcing send path — use carefully)
- Optional `?date=YYYY-MM-DD` for a specific EAT day

Idempotent per `eod:{date}:{phone}`.

## Audit

Rows in `finance_sms_logs` (`SENT` | `FAILED` | `SKIPPED`) plus `audit_logs` actions `FINANCE_SMS_SENT` / `FINANCE_SMS_FAILED`. Visible on the Finance SMS settings page.

## Schema

See `docs/SCHEMA_PUSH_FINANCE_SMS.md`. Requires Turso `prisma db push` after deploy.

## Deferred

WhatsApp, email, AI copy, bank webhooks, director portal, category breakdown.
