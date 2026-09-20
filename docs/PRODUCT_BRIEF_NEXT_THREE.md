# IMS product briefs — next three + stock gate

**Rank (unchanged):** 1 Spirits QC templates → 2 Finance CoA wizard → 3 Plant maintenance assets  
**Also:** Stock gate messaging (can ship as small fix anytime — don’t block #1)

---

## 1) Spirits QC templates (next MVP)

**Problem:** Live QC library is brewery-only (Finished Beer, Wort, Packaging, Beer Microbiology). Spirits can be hand-built but ops won’t.

**Ship:**
- Seed **spirits** standards (lineFamily SPIRITS), each with ≥1 parameter (ban Active + 0 params — already a product rule).
- Suggested MVP templates:
  1. **Incoming spirit / GNS** — ABV %, appearance
  2. **Post-distill / new make** — ABV %, clarity
  3. **Post-blend / proofing** — ABV % (target band), temperature optional
  4. **Pre-bottle** — ABV %, fill volume (ml)
  5. **Packaging (spirits)** — label/cap check (pass/fail), fill volume spot-check
- Stages/sample points: `RECEIVING_SPIRIT | POST_DISTILL | POST_BLEND | PROOFING | PRE_BOTTLE | PACKAGING` (alongside existing brewery stages — don’t delete beer).
- Optional link: quality standard → FG product or Item (nice); not required to merge if time-tight.
- Methanol: include as **optional** parameter on incoming/new-make only if lab actually runs it; don’t fake required methanol for every spirit.

**Defer:** Full LIMS, certificate PDF, automatic batch hold from fail (wire later to FGLot.qaStatus).

**Acceptance:** Create SPIRITS standard from template in <1 min; cannot save Active with 0 parameters; brewery templates still listed.

---

## 2) Finance CoA wizard (after #1)

**Problem:** Empty CoA + guidance text ≠ usable bootstrap.

**Ship:**
- Wizard steps: (1) Pick template **Brewery+Spirits TZ SME** or **Minimal** → (2) Preview accounts → (3) Create CoA + optional default cash/bank stubs → (4) Done → chart list.
- Template must include: Assets (cash, bank, inventory, AR), Liabilities (AP, tax/excise payable stub), Equity, Revenue (beer sales, spirits sales), COGS/expenses basics.
- Idempotent: won’t duplicate if CoA already has accounts (show “already set up”).
- No full GL posting rewrite in this PR.

**Defer:** Multi-company templates, Tally import as wizard step one (Tally sync stays separate), opening-balance spreadsheet import.

**Acceptance:** Fresh company → wizard → ≥15 real accounts visible; second run safe.

---

## 3) Plant maintenance assets (after #2)

**Problem:** WO asset picker is Vehicle-only; plant (stills, tanks, fillers) invisible.

**Ship:**
- `Asset` or extend model: `assetType` = `VEHICLE` | `PLANT` (vehicles can remain linked to existing Vehicle row **or** unify later — prefer **PlantAsset** table + WO accepts `vehicleId` **or** `plantAssetId`).
- Plant fields MVP: code, name, category (`STILL|TANK|FILLER|BOILER|OTHER`), location/notes, status ACTIVE.
- WO create: asset kind toggle Vehicle | Plant; picker matches kind.
- Seed 3–5 demo plant assets (e.g. Pot still 1, Spirit tank ST-01, Bottling filler).

**Defer:** Full CMMS (meter readings, spares auto-issue), merging Vehicle into generic Asset in one big bang.

**Acceptance:** Create WO on a still; vehicle WOs unbroken.

---

## 4) Stock gate messaging (small, anytime)

**Product call:** **Hard block by default** (cancel/prevent start when materials short) — correct for inventory truth.

**Must show user-facing copy:**
- Title: “Not enough stock to start”
- List each short material: item code/name, required vs available, warehouse
- Primary: **Fix stock / receive goods**
- Secondary (permissioned): **Override & start** with **required reason** + audit log — only if role allows; hide for basic operators.

No silent cancel. No override without reason.

