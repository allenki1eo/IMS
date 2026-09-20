/**
 * Spirits QC catalog — stages, sample points, and installable standard templates.
 * Alongside brewery-qc.ts (do not remove beer templates).
 */

export const SPIRITS_TEST_TYPES = [
  { value: "INCOMING_SPIRIT", label: "Incoming Spirit / GNS" },
  { value: "NEW_MAKE", label: "New Make / Distillate" },
  { value: "BLEND_PROOF", label: "Blend / Proofing" },
  { value: "PRE_BOTTLE", label: "Pre-Bottle" },
  { value: "PACKAGING_SPIRITS", label: "Packaging (Spirits)" },
  { value: "SENSORY", label: "Sensory" },
] as const;

/** Stages from product brief — keep brewery stages intact; these sit alongside. */
export const SPIRITS_TEST_STAGES = [
  { value: "RECEIVING_SPIRIT", label: "Receiving Spirit" },
  { value: "POST_DISTILL", label: "Post-Distill" },
  { value: "POST_BLEND", label: "Post-Blend" },
  { value: "PROOFING", label: "Proofing" },
  { value: "PRE_BOTTLE", label: "Pre-Bottle" },
  { value: "PACKAGING", label: "Packaging" },
] as const;

export const SPIRITS_SAMPLE_POINTS = [
  { value: "SPIRIT_RECEIVING", label: "Spirit Receiving Bay" },
  { value: "STILL_RECEIVER", label: "Still Receiver / New Make" },
  { value: "BLEND_TANK", label: "Blend Tank" },
  { value: "PROOFING_TANK", label: "Proofing Tank" },
  { value: "PRE_BOTTLE_HOLD", label: "Pre-Bottle Hold Tank" },
  { value: "SPIRITS_FILLER", label: "Spirits Filler" },
  { value: "PACKED_SPIRITS", label: "Packed Spirits" },
] as const;

export type SpiritsTemplateParameter = {
  name: string;
  unit: string | null;
  minValue: number | null;
  maxValue: number | null;
  targetValue: number | null;
  sortOrder: number;
  /** Defaults true when installing; methanol / temperature stay optional. */
  isRequired?: boolean;
};

export type SpiritsStandardTemplate = {
  code: string;
  name: string;
  lineFamily: "SPIRITS";
  testType: string;
  testStage: string;
  description: string;
  parameters: SpiritsTemplateParameter[];
};

export const SPIRITS_STANDARD_TEMPLATES: SpiritsStandardTemplate[] = [
  {
    code: "SPIRIT-INCOMING-GNS",
    name: "Incoming Spirit / GNS",
    lineFamily: "SPIRITS",
    testType: "INCOMING_SPIRIT",
    testStage: "RECEIVING_SPIRIT",
    description: "Receiving checks for bulk spirit / GNS before intake to stock.",
    parameters: [
      { name: "ABV", unit: "%", minValue: 90.0, maxValue: 97.0, targetValue: 96.0, sortOrder: 10 },
      { name: "Appearance", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 20 },
      // Optional — only when the lab actually runs methanol; not required on every spirit.
      {
        name: "Methanol",
        unit: "mg/L",
        minValue: null,
        maxValue: 50,
        targetValue: null,
        sortOrder: 30,
        isRequired: false,
      },
    ],
  },
  {
    code: "SPIRIT-NEW-MAKE",
    name: "Post-Distill / New Make",
    lineFamily: "SPIRITS",
    testType: "NEW_MAKE",
    testStage: "POST_DISTILL",
    description: "New-make spirit checks after distillation, before aging or blending.",
    parameters: [
      { name: "ABV", unit: "%", minValue: 55.0, maxValue: 85.0, targetValue: 70.0, sortOrder: 10 },
      { name: "Clarity", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 20 },
      {
        name: "Methanol",
        unit: "mg/L",
        minValue: null,
        maxValue: 100,
        targetValue: null,
        sortOrder: 30,
        isRequired: false,
      },
    ],
  },
  {
    code: "SPIRIT-POST-BLEND",
    name: "Post-Blend / Proofing",
    lineFamily: "SPIRITS",
    testType: "BLEND_PROOF",
    testStage: "PROOFING",
    description: "ABV band after blending and proofing to bottling strength.",
    parameters: [
      { name: "ABV", unit: "%", minValue: 37.0, maxValue: 43.0, targetValue: 40.0, sortOrder: 10 },
      {
        name: "Temperature",
        unit: "°C",
        minValue: 15,
        maxValue: 25,
        targetValue: 20,
        sortOrder: 20,
        isRequired: false,
      },
      { name: "Appearance", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
    ],
  },
  {
    code: "SPIRIT-PRE-BOTTLE",
    name: "Pre-Bottle Release",
    lineFamily: "SPIRITS",
    testType: "PRE_BOTTLE",
    testStage: "PRE_BOTTLE",
    description: "Final ABV and fill-volume checks before bottling starts.",
    parameters: [
      { name: "ABV", unit: "%", minValue: 37.5, maxValue: 42.5, targetValue: 40.0, sortOrder: 10 },
      { name: "Fill Volume", unit: "ml", minValue: 745, maxValue: 760, targetValue: 750, sortOrder: 20 },
      { name: "Clarity", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
    ],
  },
  {
    code: "SPIRIT-PACK-QC",
    name: "Packaging (Spirits)",
    lineFamily: "SPIRITS",
    testType: "PACKAGING_SPIRITS",
    testStage: "PACKAGING",
    description: "Line checks for spirits packaging — label/cap and fill spot-check.",
    parameters: [
      { name: "Label / Cap Check", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 10 },
      { name: "Fill Volume Spot-Check", unit: "ml", minValue: 745, maxValue: 760, targetValue: 750, sortOrder: 20 },
      { name: "Batch / Lot Code", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
      { name: "Seal Integrity", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 40 },
    ],
  },
];
