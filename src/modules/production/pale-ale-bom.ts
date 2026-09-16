/**
 * Realistic Pale Ale example BOM for a ~1000 L brewery batch.
 * Quantities are approximate for a standard pale ale (~12 °P, ~35 IBU)
 * at typical commercial brewery efficiency — enough for demos and stock gates.
 */

export type PaleAleBomLine = {
  itemCode: string;
  name: string;
  quantity: number;
  uom: string;
  wastagePct: number;
  /** Suggested opening stock for seed/demo so a few batches can start. */
  seedStock: number;
  itemType?: string;
};

export const PALE_ALE_RECIPE = {
  code: "RECIPE-PA",
  name: "Pale Ale (example)",
  productCode: "FG-PALE-ALE",
  productName: "Pale Ale",
  batchSize: 1000,
  uom: "L",
  version: "1",
  notes:
    "Example 1000 L pale ale BOM: base + specialty malt, bittering/aroma hops, dry ale yeast, and brewing salts. Link lines to warehouse items so batch Start stock checks work.",
} as const;

export const PALE_ALE_BOM_LINES: PaleAleBomLine[] = [
  {
    itemCode: "RM-MALT-PALE",
    name: "Pale Malt (2-row)",
    quantity: 160,
    uom: "KG",
    wastagePct: 2,
    seedStock: 2500,
  },
  {
    itemCode: "RM-MALT-CRYSTAL",
    name: "Crystal Malt 60L",
    quantity: 15,
    uom: "KG",
    wastagePct: 2,
    seedStock: 300,
  },
  {
    itemCode: "RM-MALT-MUNICH",
    name: "Munich Malt",
    quantity: 10,
    uom: "KG",
    wastagePct: 2,
    seedStock: 250,
  },
  {
    itemCode: "RM-HOP-MAGNUM",
    name: "Magnum Hops (bittering)",
    quantity: 0.15,
    uom: "KG",
    wastagePct: 1,
    seedStock: 5,
  },
  {
    itemCode: "RM-HOP-CASCADE",
    name: "Cascade Hops (aroma)",
    quantity: 0.25,
    uom: "KG",
    wastagePct: 1,
    seedStock: 5,
  },
  {
    itemCode: "RM-HOP-CITRA",
    name: "Citra Hops (late/dry hop)",
    quantity: 0.2,
    uom: "KG",
    wastagePct: 1,
    seedStock: 4,
  },
  {
    itemCode: "RM-YEAST-US05",
    name: "Dry Ale Yeast (US-05 style)",
    quantity: 0.5,
    uom: "KG",
    wastagePct: 0,
    seedStock: 10,
  },
  {
    itemCode: "RM-SALT-GYPSUM",
    name: "Gypsum (CaSO4)",
    quantity: 0.05,
    uom: "KG",
    wastagePct: 0,
    seedStock: 5,
  },
  {
    itemCode: "RM-SALT-CACL2",
    name: "Calcium Chloride",
    quantity: 0.04,
    uom: "KG",
    wastagePct: 0,
    seedStock: 5,
  },
];

export const PALE_ALE_FINISHED_GOOD = {
  itemCode: "FG-PALE-ALE",
  name: "Pale Ale (finished)",
  uom: "L",
  itemType: "FINISHED_GOOD",
  seedStock: 0,
} as const;
