# Product brief — Finance SMS alerts (IMS)

**Status:** Product intent from Allen (2026-09-20)  
**Gateway preference:** Swala SMS (swalasms.com) — same as Quiet Care unless overridden  
**Out of scope now:** Director portal (separate product later)

---

## Goals

1. **Deposit SMS** — When a bank/cash deposit is recorded against an account, notify specific people by SMS.
2. **End-of-day summary SMS** — Daily digest of total money **used** (outflows), rolled up for **all companies** — **LOCKED: one combined SMS** (not per-company).

---

## A. Deposit alert

**Trigger:** Finance posts a deposit (bank transaction / cashbook RECEIPT / equivalent “money in” event) that credits an account.

**Must-have:**
- Settings: enable/disable per company (and global admin for multi-company digest)
- Recipient list: phone numbers + optional role label (Director, Accountant) — not “SMS everyone”
- Message template (EN; SW later): company name, account name/code, amount TZS, datetime EAT, reference
- Idempotent: one SMS per deposit event (no resend on edit unless amount changes — defer re-alert)
- Audit: log sent/failed + provider message id

**Defer:** WhatsApp, email CC, AI-written copy, waiting for bank API webhooks (manual/Tally-posted deposits still trigger)

---

## B. End-of-day spend summary

**Trigger:** Cron ~18:00–20:00 EAT (configurable), once per day.

**Definition of “money used” (MVP):** sum of that day’s outflows = payments + cash out + bank withdrawals (exclude transfers between own accounts to avoid double count). Deposits are **not** in this SMS (they have their own alert).

**Must-have:**
- **All-companies rollup only** SMS to a global recipient list (directors). No per-company EOD SMS in MVP
- Body: date, per-company spend lines, grand total TZS
- Skip send if all zeros (optional toggle; default still send “0 used” for trust — product default: **skip if zero** to save SMS cost)
- Same Swala + audit as deposits

**Defer:** Category breakdown, budget vs actual, PDF attachment

---

## C. Director portal (parked)

Separate app/area later: multi-company money in/out, approvals, read-only finance.  
**Today:** recipient lists + rollup SMS are enough; store phones on User/Employee or FinanceNotificationSetting — don’t invent portal auth yet.

---

## D. Build order vs existing Finance rank

- CoA wizard still unlocks empty Finance (keep as setup foundation).
- SMS can land **after CoA wizard** or as a thin slice once cashbook/bank txn exists.
- Needs: Swala API credentials in server env; never in client.

---

## E. Acceptance

- [ ] Post deposit → configured phones get SMS within ~1 min  
- [ ] EOD job → rollup spend SMS (all companies)  
- [ ] Failures visible in audit; no duplicate spam on refresh  
- [ ] Director portal not started in this PR  

