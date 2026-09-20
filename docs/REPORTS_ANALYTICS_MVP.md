# Reports & Analytics MVP — implementation notes

Implements `docs/PRODUCT_BRIEF_REPORTS_MVP.md`.

## Shared spend today

- Service: `src/modules/finance/spend-today.service.ts`
- Definition identical to Finance EOD SMS: cashbook `PAYMENT` + bank `WITHDRAWAL` for the EAT calendar day; transfers excluded.
- EOD SMS (`finance-sms.service.ts`) calls `computeSpendByCompany` from this module so dashboard and SMS cannot drift.
- Empty window returns `TZS 0` (never blank / Unknown).

## Homes

| View | Route | API |
|------|-------|-----|
| Director | `/analytics` | `GET /api/reports/home?view=director` |
| Ops | `/analytics/operations` | `GET /api/reports/home?view=ops&lineFamily=` |

Director: hero spend (all companies) + ≤4 risk tiles (cash in, stock risk, QC holds, open dispatches).  
Ops: company spend, shortages (real qty or “Not linked”), batches in progress, QC pending, dispatches today.  
`lineFamily` chips: BREWING | SPIRITS | ALL.

## Reports catalog

Primary: Stock, Production, Dispatch, Finance spend.  
Thin stubs (QC / Transport / Fuel / Maintenance / Procurement) under **More**.  
Production / Stock / Dispatch accept `lineFamily`. Date windows use EAT bounds.

## Shortage “available Unknown”

Daystore + batch stock UI now show **Not linked** when the material has no item link (status `UNKNOWN` unchanged in APIs).
