export const BREWERY_TEST_TYPES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "WATER", label: "Water" },
  { value: "WORT", label: "Wort" },
  { value: "FERMENTATION", label: "Fermentation" },
  { value: "BRIGHT_BEER", label: "Bright Beer" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "MICROBIOLOGY", label: "Microbiology" },
  { value: "SENSORY", label: "Sensory" },
  { value: "RETAIN_SAMPLE", label: "Retain Sample" },
  { value: "CALIBRATION", label: "Calibration" },
] as const;

export const BREWERY_TEST_STAGES = [
  { value: "RAW_MATERIAL", label: "Raw Material" },
  { value: "BREW_WATER", label: "Brew Water" },
  { value: "MASH", label: "Mash" },
  { value: "WORT", label: "Wort" },
  { value: "FERMENTATION", label: "Fermentation" },
  { value: "CONDITIONING", label: "Conditioning" },
  { value: "BRIGHT_BEER", label: "Bright Beer" },
  { value: "PACKAGING", label: "Packaging" },
  { value: "FINISHED_GOODS", label: "Finished Goods" },
] as const;

export const BREWERY_SAMPLE_POINTS = [
  { value: "RAW_MATERIAL_RECEIVING", label: "Raw Material Receiving" },
  { value: "BREW_WATER_TANK", label: "Brew Water Tank" },
  { value: "MASH_TUN", label: "Mash Tun" },
  { value: "KETTLE", label: "Kettle" },
  { value: "WHIRLPOOL", label: "Whirlpool" },
  { value: "FERMENTER", label: "Fermenter" },
  { value: "BRIGHT_TANK", label: "Bright Tank" },
  { value: "FILLER", label: "Filler" },
  { value: "PACKED_PRODUCT", label: "Packed Product" },
  { value: "WAREHOUSE_RETAIN", label: "Warehouse Retain" },
] as const;

export const RELEASE_DECISIONS = [
  { value: "HOLD", label: "Hold" },
  { value: "RELEASED", label: "Released" },
  { value: "CONDITIONAL_RELEASE", label: "Conditional Release" },
  { value: "REJECTED", label: "Rejected" },
] as const;

export const BREWERY_STANDARD_TEMPLATES = [
  {
    code: "BEER-FINISHED",
    name: "Finished Beer Release",
    testType: "BRIGHT_BEER",
    testStage: "BRIGHT_BEER",
    description: "Core release checks before beer is approved for packaging or sale.",
    parameters: [
      { name: "ABV", unit: "%", minValue: 4.0, maxValue: 6.0, targetValue: 5.0, sortOrder: 10 },
      { name: "pH", unit: "pH", minValue: 3.8, maxValue: 4.6, targetValue: 4.2, sortOrder: 20 },
      { name: "CO2", unit: "vol", minValue: 2.3, maxValue: 2.8, targetValue: 2.5, sortOrder: 30 },
      { name: "Dissolved Oxygen", unit: "ppb", minValue: null, maxValue: 80, targetValue: 30, sortOrder: 40 },
      { name: "Turbidity", unit: "EBC", minValue: null, maxValue: 1.0, targetValue: 0.5, sortOrder: 50 },
      { name: "Sensory", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 60 },
    ],
  },
  {
    code: "WORT-QC",
    name: "Wort Quality",
    testType: "WORT",
    testStage: "WORT",
    description: "Wort checks before transfer to fermentation.",
    parameters: [
      { name: "Original Gravity", unit: "SG", minValue: 1.035, maxValue: 1.060, targetValue: 1.048, sortOrder: 10 },
      { name: "pH", unit: "pH", minValue: 5.0, maxValue: 5.6, targetValue: 5.3, sortOrder: 20 },
      { name: "Color", unit: "EBC", minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
      { name: "Bitterness", unit: "IBU", minValue: null, maxValue: null, targetValue: null, sortOrder: 40 },
    ],
  },
  {
    code: "PACK-QC",
    name: "Packaging Quality",
    testType: "PACKAGING",
    testStage: "PACKAGING",
    description: "Checks for packaged beer quality and coding.",
    parameters: [
      { name: "Fill Level", unit: "ml", minValue: null, maxValue: null, targetValue: null, sortOrder: 10 },
      { name: "Cap/Crown Seal", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 20 },
      { name: "Label Placement", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
      { name: "Batch Code", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 40 },
      { name: "Leak Check", unit: null, minValue: null, maxValue: null, targetValue: null, sortOrder: 50 },
    ],
  },
  {
    code: "MICRO-BEER",
    name: "Beer Microbiology",
    testType: "MICROBIOLOGY",
    testStage: "BRIGHT_BEER",
    description: "Microbiology checks for beer and packaging hygiene.",
    parameters: [
      { name: "Total Plate Count", unit: "CFU/ml", minValue: null, maxValue: 10, targetValue: 0, sortOrder: 10 },
      { name: "Wild Yeast", unit: "Detected", minValue: null, maxValue: null, targetValue: null, sortOrder: 20 },
      { name: "Coliforms", unit: "Detected", minValue: null, maxValue: null, targetValue: null, sortOrder: 30 },
    ],
  },
];
