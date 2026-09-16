# Product brief — IMS BOM / recipes (brewing + spirits)

**For:** Cod't (implement) · Erp (QA fold-in)  
**Context:** Cod't is on realistic BOM/recipes. Domain is **not brewery-only** — spirits manufacturing (distill / blend / bottle) sits beside brewing.  
**Goal:** One recipe/BOM model that drives stock gates, production batches, and later TRA/excise — concrete enough to ship this pass.

---

## 1. Principle

Keep **one** `ProductionRecipe` + `RecipeMaterial` spine (already in Prisma). Do **not** fork a separate Spirits BOM module. Differentiate with:

- `batchType` / recipe **line family**: `BREWING` | `SPIRITS` (and later `BLEND` if needed as a spirits subtype)
- Material **role** on each BOM line (optional string): e.g. `MALT`, `HOPS`, `YEAST`, `WATER_CHEM`, `PACKAGING` | `FERMENTABLE`, `BOTANICAL`, `NEUTRAL_SPIRIT`, `WATER`, `SUGAR`, `FLAVOUR`, `PACKAGING`
- Every material line **must resolve to a warehouse `itemId`** (via code) so Start-batch stock gates work — free-text-only lines are demo debt, not production.

Output UoM stays volume-led for both: **L** (or HL) for liquid finished goods; packaging lines in PCS/CTN as needed.

---

## 2. Must-have recipe header fields (ship now)

| Field | Why |
|---|---|
| `code`, `name`, `version`, `status` | Already there — keep |
| `productItemId` / `productCode` / `productName` | Link to finished good SKU |
| `batchSize` + `uom` | Scale BOM; stock gate math |
| `notes` | Process hints (OG target, ABV target, proof) |
| **Add:** `lineFamily` (`BREWING` \| `SPIRITS`) | Filters UI + seeds; maps to `ProductionBatch.batchType` |
| **Add (optional, cheap):** `targetAbvPct` | Spirits + beer both care; useful for QC later |
| **Skip for now:** full multi-stage process graphs, oak barrel ledgers, continuous still telemetry |

## 3. Must-have BOM line fields (ship now)

| Field | Why |
|---|---|
| `itemId` + `itemCode` + `description` | Stock link is non-negotiable |
| `quantity` + `uom` | Per batchSize |
| `wastagePct` | Already there |
| **Add (optional):** `role` | Reporting + UI grouping; not required for gate math |
| **Skip for now:** scrap codes, alternate substitutes, phantom BOMs, co-products beyond one FG |

**Rule:** `requiredQty = quantity * (1 + wastagePct/100)` scaled if batch ≠ recipe.batchSize. Stock gate uses that.

---

## 4. Sample recipes to seed (replace QA nonsense)

### A. Brewing — keep / refine existing Pale Ale
- Code: `RECIPE-PA` · batch **1000 L** · family `BREWING`
- Lines: pale/crystal/munich malt, Magnum/Cascade/Citra, yeast, gypsum, CaCl₂ (as in `pale-ale-bom.ts`)
- FG: `FG-PALE-ALE`
- **Remove** from seeds: joke items, “test item 1”, zero-qty lines, unlinked descriptions with no warehouse item

### B. Spirits — Gin (compound / RTD-style plant, shippable)
- Code: `RECIPE-GIN-01` · name: **London Dry Gin (example)** · batch **500 L** @ bottle strength · family `SPIRITS` · `targetAbvPct` ≈ 40
- BOM lines (example — Cod't may tune numbers):
  1. Neutral spirit / GNS — e.g. 200 L @ 96% ABV (or kg if that’s how stocked) — role `NEUTRAL_SPIRIT`
  2. Process water — quantity to proof down — role `WATER`
  3. Juniper berries — KG — `BOTANICAL`
  4. Coriander seed — KG — `BOTANICAL`
  5. Angelica / citrus peel (1–2 lines) — KG — `BOTANICAL`
  6. Bottles 750 ml — PCS — `PACKAGING` (optional on recipe vs separate packaging BOM; prefer **on recipe** if dispatch stock-gate needs it)
  7. Caps + labels — PCS — `PACKAGING`
- FG: `FG-GIN-750` (or bulk `FG-GIN-BULK` L if bottling is a second step)

### C. Spirits — Blended cane spirit / “local spirit” (Tanzania-relevant)
- Code: `RECIPE-SPIRIT-BLEND-01` · batch **1000 L** · family `SPIRITS` · `targetAbvPct` ≈ 40
- Lines: cane spirit / molasses spirit intermediate, water to proof, caramel/colour (if used), bottles/caps
- Keeps TRA/excise conversation honest later without building stamps into this pass

**Two spirits + one beer is enough.** Don’t seed 12 fake SKUs.

---

## 5. What to remove / stop doing (QA nonsense)

- Recipes with materials that **don’t exist** in warehouse items  
- Duplicate “Test Recipe”, “Demo BOM”, empty material lists  
- Brewing-only labels in UI that hide spirits (`batchType` default `BREWING` is fine; UI must offer both)  
- Treating packaging as a comment in `notes` instead of stocked lines when Start-batch should fail without bottles  
- Over-modeling: mash steps, still runs, barrel ages as **required** recipe fields this sprint — put process detail in `notes` or existing brewing session tables

---

## 6. UI / API behaviour (minimal)

1. Create/edit recipe: choose **Brewing** or **Spirits**  
2. Add materials from **item picker** (code search) — not free text only  
3. List filter by family  
4. Starting a batch from recipe copies materials → `BatchMaterial` and runs **warehouse stock gate** (already the production goal)  
5. Spirits batches use `batchType: SPIRITS` so Erp can QA production ≠ brewery-only

---

## 7. Out of scope this pass (backlog)

- Full excise stamp consumption on bottle (TRA stamps module exists — wire later)  
- Multi-output BOM (heads/tails/feints as co-products)  
- Aging / barrel location as recipe stages  
- Recipe approval workflow beyond ACTIVE/DRAFT if not already there  

---

## 8. Acceptance for Cod't’s pass

- [ ] `lineFamily` (or equivalent) on recipe; batch inherits type  
- [ ] Pale Ale seed still realistic and **fully item-linked**  
- [ ] At least one spirits recipe seed (gin **or** cane blend) item-linked  
- [ ] Stock gate fails loudly if a BOM item has insufficient qty  
- [ ] No orphan demo recipes without materials  
- [ ] UI copy not brewery-exclusive (“Recipe / BOM” works for both lines)

---

## 9. Priority after this (for Idealy/Erp/Cod't planning)

After warehouse / procurement / production stock-gate:  
1. Harden BOM↔item links + spirits seed  
2. Packaging as first-class BOM lines  
3. QC templates for spirits (ABV, turbidity) beside brewery QC  
4. TRA stamps on bottled FG dispatch  

*This brief is product law for the current BOM pass — ship the spine, seed two families, delete nonsense.*
