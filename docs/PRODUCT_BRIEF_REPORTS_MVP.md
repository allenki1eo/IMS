# Product brief — Reports & Analytics MVP (IMS)

**For:** Cod't (implement) · Erp (verify lying numbers) · Canvy (Director vs Ops frames)  
**Principle:** Trust before charts. Fewer pages. Answer “what do I do today?”

---

## 1. Goals

1. **One shared truth** for “spend today” — same definition as Finance **EOD SMS** (combined all-companies rollup of outflows; exclude internal transfers).
2. **Two role homes** — Director vs Ops — not one wallpaper dashboard.
3. **lineFamily** on every production/stock/dispatch-related report: `BREWING` | `SPIRITS` | `ALL`.
4. **Cut or hide orphan** report pages that don’t earn a decision.

---

## 2. Spend today (shared metric)

| Rule | Detail |
|---|---|
| Definition | Sum of **outflows** today EAT: payments + cash out + bank withdrawals; **exclude** transfers between own accounts |
| Scope | Match EOD SMS: can show **per company** on Ops home and **all-companies total** on Director home |
| Label | “Spend today” / “Matumizi leo” |
| Sync | Dashboard number **must equal** what EOD SMS would send for the same window |
| Empty | Show `TZS 0` honestly — never blank/Unknown |

---

## 3. Director home (sparse)

**Audience:** owners / directors (multi-company).  
**Layout (Canvy):** 1 hero number + ≤4 risk tiles. No chart wallpaper.

| Tile | Source of truth | Action hint |
|---|---|---|
| **Spend today** (all companies) | Same as EOD SMS rollup | Open Finance spend detail |
| **Cash / bank in today** | Deposits posted today | Optional link to deposit log |
| **Stock risk** | Items below min / failed stock gates (count) | Warehouse shortages |
| **QC holds** | FG lots `qaStatus=HOLD` or PENDING aged | QC / FG lots |
| **Open dispatches** | Dispatch DRAFT or scheduled today | Dispatch list |

**Defer on Director home:** pretty trend charts, full P&L, TRA stamp burn charts.

---

## 4. Ops home (sparse)

**Audience:** production / warehouse / dispatch leads (usually one company context).

| Tile | Notes |
|---|---|
| **Spend today** (this company) | Same definition, company-scoped |
| **Shortages** | Required vs **available** (never “Unknown” — fix item link or show “not linked”) |
| **Batches in progress** | Filter lineFamily |
| **QC pending release** | Lots PENDING |
| **Dispatches to run today** | Scheduled / DRAFT with lines |

---

## 5. Report catalog (keep / merge / cut)

| Report | Decision |
|---|---|
| Production | **Keep** — fix isolation; add lineFamily filter |
| Stock / warehouse | **Keep** — shortages with real available qty |
| Dispatch (+ TRA where relevant) | **Keep** — Turso-safe; lineFamily via FG |
| Finance spend / cash movement | **Keep** — powers Spend today |
| Analytics KPI strip | **Keep only if** numbers match module data; else hide tile |
| Thin Daily Movement / orphan stubs | **Merge into stock ledger or cut** |
| Procurement bleed into Production | **Bug** — never ship cross-module stats |

---

## 6. lineFamily

- Default filter: `ALL`, with Brewing / Spirits chips.
- Production, batches, FG, QC-linked reports respect it.
- Finance spend may stay company-wide (money isn’t beer vs gin) unless tagged later.

---

## 7. Dates

- All report windows in **Africa/Dar_es_Salaam (EAT)**.
- One display format (prefer DD/MM/YYYY or ISO date — match Settings; **no** MM/DD placeholders).
- “Today” = EAT calendar day for Spend today and EOD SMS.

---

## 8. Explicit non-goals (this MVP)

- New chart library / wallpaper
- Director portal app (parked)
- Perfect predictive analytics
- Rebuilding every legacy report

---

## 9. Acceptance

- [ ] Director “Spend today” (all co) == EOD SMS rollup for same day  
- [ ] Ops “Spend today” (one co) == that company’s slice of the same definition  
- [ ] No “available Unknown” on shortage tiles when item is linked; if unlinked, say “Not linked to stock”  
- [ ] Production / stock / dispatch reports have lineFamily filter where applicable  
- [ ] Orphan thin reports removed or redirected  
- [ ] Erp sign-off: no lying KPI vs live module counts  

---

## 10. Build order

1. Shared `spendToday` service (EOD SMS + dashboards)  
2. Shortage available-qty fix  
3. Director + Ops home tiles  
4. lineFamily on Production/Stock/Dispatch reports  
5. Cut/merge orphans  

*Canvy: sketch Director vs Ops frames against §3–4 when ready.*
