/**
 * Spirits recipe/BOM templates (same ProductionRecipe spine as brewing).
 * East African / GAKI-style: gin compound + cane spirit blend.
 * Quantities are industry-plausible demo values for stock gates — not lab physics.
 */

export type SpiritsBomLine = {
  itemCode: string;
  name: string;
  quantity: number;
  uom: string;
  wastagePct: number;
  seedStock: number;
  role?: string;
  itemType?: string;
};

// ── London Dry Gin (compound) ────────────────────────────────────────────────
// 500 L @ ~40% ABV from GNS (~96% ABV) + process water + botanicals + packaging.
// LAA = 500 × 0.40 = 200 → GNS vol ≈ 200 / 0.96 ≈ 208.3 L; water ≈ 291.7 L.
// Bottles 750 ml: 500 / 0.75 ≈ 667 PCS.

export const GIN_RECIPE = {
  code: "RECIPE-GIN-01",
  name: "London Dry Gin (example)",
  productCode: "FG-GIN-750",
  productName: "London Dry Gin 750 ml",
  batchSize: 500,
  uom: "L",
  version: "1",
  lineFamily: "SPIRITS" as const,
  targetAbvPct: 40,
  notes:
    "Example spirits BOM: proof GNS to ~40% ABV with process water, steep botanicals, bottle 750 ml with caps/labels. Link every line to warehouse items for Start-batch stock checks.",
} as const;

export const GIN_BOM_LINES: SpiritsBomLine[] = [
  {
    itemCode: "RM-GNS-96",
    name: "Grain Neutral Spirit (96% ABV)",
    quantity: 208.3,
    uom: "L",
    wastagePct: 1,
    seedStock: 3000,
    role: "NEUTRAL_SPIRIT",
  },
  {
    itemCode: "RM-WATER-PROCESS",
    name: "Process / demineralised water",
    quantity: 291.7,
    uom: "L",
    wastagePct: 0,
    seedStock: 20000,
    role: "WATER",
  },
  {
    itemCode: "RM-JUNIPER",
    name: "Juniper berries",
    // ~5 g/L finished for a classic London Dry profile
    quantity: 2.5,
    uom: "KG",
    wastagePct: 2,
    seedStock: 50,
    role: "BOTANICAL",
  },
  {
    itemCode: "RM-CORIANDER",
    name: "Coriander seed",
    quantity: 1.0,
    uom: "KG",
    wastagePct: 2,
    seedStock: 30,
    role: "BOTANICAL",
  },
  {
    itemCode: "RM-ANGELICA",
    name: "Angelica root",
    quantity: 0.3,
    uom: "KG",
    wastagePct: 2,
    seedStock: 10,
    role: "BOTANICAL",
  },
  {
    itemCode: "RM-CITRUS-PEEL",
    name: "Citrus peel (dried)",
    quantity: 0.4,
    uom: "KG",
    wastagePct: 2,
    seedStock: 15,
    role: "BOTANICAL",
  },
  {
    itemCode: "PKG-BOTTLE-750",
    name: "Glass Bottle 750 ml",
    quantity: 667,
    uom: "PCS",
    wastagePct: 2,
    seedStock: 5000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
  {
    itemCode: "PKG-CAP-ROPP",
    name: "ROPP Cap (bottle)",
    quantity: 667,
    uom: "PCS",
    wastagePct: 1,
    seedStock: 6000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
  {
    itemCode: "PKG-LABEL-GIN-750",
    name: "Label set — Gin 750 ml",
    quantity: 667,
    uom: "PCS",
    wastagePct: 3,
    seedStock: 6000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
];

export const GIN_FINISHED_GOOD = {
  itemCode: "FG-GIN-750",
  name: "London Dry Gin 750 ml",
  uom: "L",
  itemType: "FINISHED_GOOD",
  seedStock: 0,
} as const;

// ── Cane / molasses spirit blend ─────────────────────────────────────────────
// 1000 L @ ~40% ABV from ~80% ABV cane spirit intermediate + water + colour + pkg.
// Bulk spirit: 1000 × 0.40 / 0.80 = 500 L; water ≈ 500 L; bottles ≈ 1334 PCS.

export const SPIRIT_BLEND_RECIPE = {
  code: "RECIPE-SPIRIT-BLEND-01",
  name: "Cane spirit blend (example)",
  productCode: "FG-CANE-SPIRIT-750",
  productName: "Cane Spirit 750 ml",
  batchSize: 1000,
  uom: "L",
  version: "1",
  lineFamily: "SPIRITS" as const,
  targetAbvPct: 40,
  notes:
    "Example local cane/molasses blend: reduce ~80% ABV bulk spirit to ~40% ABV, optional caramel colour, bottle with caps/labels.",
} as const;

export const SPIRIT_BLEND_BOM_LINES: SpiritsBomLine[] = [
  {
    itemCode: "RM-CANE-SPIRIT-80",
    name: "Cane / molasses spirit (~80% ABV)",
    quantity: 500,
    uom: "L",
    wastagePct: 1,
    seedStock: 5000,
    role: "NEUTRAL_SPIRIT",
  },
  {
    itemCode: "RM-WATER-PROCESS",
    name: "Process / demineralised water",
    quantity: 500,
    uom: "L",
    wastagePct: 0,
    seedStock: 20000,
    role: "WATER",
  },
  {
    itemCode: "RM-CARAMEL-COLOUR",
    name: "Caramel colour (E150a)",
    quantity: 0.8,
    uom: "KG",
    wastagePct: 0,
    seedStock: 25,
    role: "FLAVOUR",
  },
  {
    itemCode: "PKG-BOTTLE-750",
    name: "Glass Bottle 750 ml",
    quantity: 1334,
    uom: "PCS",
    wastagePct: 2,
    seedStock: 5000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
  {
    itemCode: "PKG-CAP-ROPP",
    name: "ROPP Cap (bottle)",
    quantity: 1334,
    uom: "PCS",
    wastagePct: 1,
    seedStock: 6000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
  {
    itemCode: "PKG-LABEL-CANE-750",
    name: "Label set — Cane Spirit 750 ml",
    quantity: 1334,
    uom: "PCS",
    wastagePct: 3,
    seedStock: 6000,
    role: "PACKAGING",
    itemType: "PACKAGING",
  },
];

export const SPIRIT_BLEND_FINISHED_GOOD = {
  itemCode: "FG-CANE-SPIRIT-750",
  name: "Cane Spirit 750 ml",
  uom: "L",
  itemType: "FINISHED_GOOD",
  seedStock: 0,
} as const;

/** Deduped warehouse seed lines for spirits materials (max seedStock wins). */
export function spiritsSeedMaterialLines(): SpiritsBomLine[] {
  const byCode = new Map<string, SpiritsBomLine>();
  for (const line of [...GIN_BOM_LINES, ...SPIRIT_BLEND_BOM_LINES]) {
    const existing = byCode.get(line.itemCode);
    if (!existing || line.seedStock > existing.seedStock) {
      byCode.set(line.itemCode, line);
    }
  }
  return Array.from(byCode.values());
}
