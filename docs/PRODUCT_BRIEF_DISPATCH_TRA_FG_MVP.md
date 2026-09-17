# MVP — Dispatch + TRA + FG fields (one PR)

**For:** Cod't · fold via Erp  
**Scope:** Spirits + brewing. Shippable in one PR. Defer the rest.

---

## A. FGProduct — add fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `lineFamily` | `BREWING` \| `SPIRITS` | yes | Same vocabulary as recipes |
| `abvPct` | Float? | required if SPIRITS; optional BREWING | Label strength |
| `packSize` | Float? | yes if bottled FG | e.g. 0.75 |
| `packUom` | String? | with packSize | `L` / `ML` |
| `unitsPerCase` | Int? | optional | |
| `requiresTraStamp` | Boolean | default true for SPIRITS bottled; false for bulk/WIP | |
| `traStampType` | String? | if requiresTraStamp | Align with `TraStampBatch.stampType` (`BEER`, `SPIRITS`, …) |
| `defaultWarehouseId` | String? | optional | |

**Defer:** full batch FK on product (use lot), multi-pack variants, barcode.

**Validation:** code+name required; `abvPct` 0–100 if set; can’t activate TRA path if `requiresTraStamp` and no `traStampType`.

---

## B. FGLot receive — tighten

| Field | Validation |
|---|---|
| `lotNumber` | **required** (no anonymous lots) |
| `warehouseId` | **required** |
| `quantityIn` | > 0 |
| `productId` | required |
| **Add** `productionBatchId` | optional FK → ProductionBatch |
| **Add** `abvPct` | optional; default from product; editable if lab differs |
| **Add** `qaStatus` | `PENDING` \| `RELEASED` \| `HOLD` — default PENDING; **dispatch only if RELEASED** (or allow override with note — prefer hard gate for MVP) |
| **Add** `qaReleasedAt` / `qaReleasedById` | set on release |

**Defer:** full QC test link UI; TRA stamp IDs on lot (come from activation).

---

## C. DispatchOrder create — not header-only

**Header must-have:** customerName, reference (auto ok), status DRAFT→…  
**Create UI must collect ≥1 line before save** (or allow DRAFT with 0 lines but **block DISPATCHED** until lines exist).

**Each line must-have:**
- `lotId` **required** when moving to DISPATCHED (productId alone not enough for compliance)
- `quantity` > 0 and ≤ lot remaining (`quantityIn - quantityOut`)
- `uom` from product/lot
- description can default from product name

**On DISPATCHED:** decrement lot `quantityOut`; if `product.requiresTraStamp`, require linked TRA activation covering qty (see D).

**Defer:** sales-order auto-import, pricing/tax calc, e-signature POD.

---

## D. TraStampActivation — stop free-text-only

| Change | Detail |
|---|---|
| Keep `productName` | Denormalized display OK |
| **Add** `fgProductId` | required |
| **Add** `fgLotId` | required for bottled activation |
| **Add** `dispatchOrderId` | optional but preferred when activating at dispatch |
| `quantity` | Int > 0; ≤ batch remaining (`quantity - used`); increment batch `used` |
| `stampType` match | Product `traStampType` must match batch `stampType` |

**Validation:** no activation without FG product+lot; reject if lot qaStatus ≠ RELEASED; reject over-use of stamp batch.

**Defer:** serial-level stamp scan, TRA API sync, refunds/voids workflow beyond status note.

---

## E. Out of this PR

- Finance CoA wizard  
- Spirits QC template library (separate PR — still next after this for compliance depth)  
- Plant equipment maintenance  
- Transport/Fuel lineFamily filter (nice; not blocking dispatch)  
- Daily Movement keep/cut decision (lean **consolidate into stock ledger / cut standalone** if unused)

---

## F. Acceptance checklist

- [ ] Create SPIRITS FG with ABV + pack + requiresTraStamp  
- [ ] Receive lot: lot# + warehouse required; qaStatus PENDING→RELEASED  
- [ ] Dispatch cannot go DISPATCHED with 0 lines or unreleased lot  
- [ ] TRA activation picks FG+lot (not free-text only); stamp batch decrements  
- [ ] Brewing beer FG still works (lineFamily BREWING, stampType BEER)
