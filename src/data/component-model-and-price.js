/**
 * Single source of truth for component prices, models, controller max pixels,
 * receiving cards, cabinet sizes, and related quotation defaults.
 * Edit this file directly; the React calculator now loads catalog data
 * from this source file only.
 */

const CABINET_DEFAULT_PRICE = 8000;

const CABINET_SIZE_SPECS = {
  "640x480": { label: "640mm x 480mm", widthMm: 640, heightMm: 480, modulesPerCabinet: 6 },
  "640x640": { label: "640mm x 640mm", widthMm: 640, heightMm: 640, modulesPerCabinet: 8 },
  "960x960": { label: "960mm x 960mm", widthMm: 960, heightMm: 960, modulesPerCabinet: 18 },
  "1280x1280": { label: "1280mm x 1280mm", widthMm: 1280, heightMm: 1280, modulesPerCabinet: 32 },
};

function cabinetOption({ displayType, materialCode, materialLabel, variantCode = "", variantLabel = "", sizeKey }) {
  const size = CABINET_SIZE_SPECS[sizeKey];
  const idParts = [displayType, materialCode, variantCode, sizeKey].filter(Boolean);
  return {
    id: `cabinet_${idParts.join("_")}`,
    displayType,
    materialCode,
    materialLabel,
    variantCode,
    variantLabel,
    sizeKey,
    label: size.label,
    widthMm: size.widthMm,
    heightMm: size.heightMm,
    modulesPerCabinet: size.modulesPerCabinet,
    price: CABINET_DEFAULT_PRICE,
  };
}

const INDOOR_CABINET_OPTIONS = ["640x480", "640x640"].map((sizeKey) =>
  cabinetOption({
    displayType: "indoor",
    materialCode: "aluminium",
    materialLabel: "Aluminium",
    sizeKey,
  })
);

const OUTDOOR_CABINET_OPTIONS = [
  ...["open", "backdoor"].flatMap((variantCode) =>
    ["640x480", "640x640", "960x960", "1280x1280"].map((sizeKey) =>
      cabinetOption({
        displayType: "outdoor",
        materialCode: "mild_steel",
        materialLabel: "Mild Steel",
        variantCode,
        variantLabel: variantCode === "open" ? "Open" : "Backdoor",
        sizeKey,
      })
    )
  ),
  ...["magnesium", "aluminium"].flatMap((materialCode) =>
    ["640x480", "640x640", "960x960", "1280x1280"].map((sizeKey) =>
      cabinetOption({
        displayType: "outdoor",
        materialCode,
        materialLabel: materialCode === "magnesium" ? "Magnesium" : "Aluminium",
        sizeKey,
      })
    )
  ),
];

export const componentModelAndPrice = {
  schemaVersion: 1,

  modelGroups: {
    smd: {
      indoor: [
        { id: "smd-in-p1_25", name: "P1.25", prices: { gold: 9300, platinum: 10500, diamond: 11500 } },
        { id: "smd-in-p1_53", name: "P1.53", prices: { gold: 6082, platinum: 7115, diamond: 9478 } },
        { id: "smd-in-p1_86", name: "P1.8", prices: { gold: 4020, platinum: 4850, diamond: 5400 } },
        { id: "smd-in-p2", name: "P2", prices: { gold: 3000, platinum: 3400, diamond: 3800 } },
        { id: "smd-in-p2_5", name: "P2.5", prices: { gold: 2350, platinum: 2700, diamond: 3160 } },
        { id: "smd-in-p3", name: "P3", prices: { gold: 2850, platinum: 3600, diamond: 3900 } },
      ],
      outdoor: [
        { id: "smd-out-p2_5", name: "P2.5", prices: { gold: 6500, platinum: 7200, diamond: 8100 } },
        { id: "smd-out-p3", name: "P3", prices: { gold: 2618, platinum: 3237, diamond: 3627 } },
        { id: "smd-out-p3.91", name: "P3.91", prices: { gold: 3500, platinum: 4250, diamond: 5020 } },
        { id: "smd-out-p4", name: "P4", prices: { gold: 2850, platinum: 3500, diamond: 5200 } },
        { id: "smd-out-p5", name: "P5", prices: { gold: 2350, platinum: 3050, diamond: 4000 } },
        { id: "smd-out-p6", name: "P6", prices: { gold: 1860, platinum: 1998, diamond: 2227 } },
        { id: "smd-out-p6_67", name: "P6.67", prices: { gold: 2205, platinum: 2365, diamond: 2640 } },
        { id: "smd-out-p8", name: "P8", prices: { gold: 1929, platinum: 2044, diamond: 2227 } },
        { id: "smd-out-p10", name: "P10", prices: { gold: 1677, platinum: 1746, diamond: 1883 } },
      ],
    },
    gob: {
      indoor: [
        { id: "gob-in-p1_25", name: "P1.25", prices: { gold: 5800, platinum: 6450, diamond: 7200 } },
        { id: "gob-in-p1_53", name: "P1.53", prices: { gold: 4600, platinum: 5350, diamond: 6320 } },
        { id: "gob-in-p1_86", name: "P1.8", prices: { gold: 4350, platinum: 4825, diamond: 5676 } },
        { id: "gob-in-p2", name: "P2", prices: { gold: 3618, platinum: 4393, diamond: 5168 } },
        { id: "gob-in-p2.5", name: "P2.5", prices: { gold: 2950, platinum: 3650, diamond: 4100 } },
        { id: "gob-in-p3", name: "P3", prices: { gold: 4000, platinum: 4700, diamond: 5150 } },
      ],
    },
    cob: {
      indoor: [
        { id: "cob-in-p1_25", name: "P1.25", prices: { gold: 12500, platinum: 13250, diamond: 14000 } },
        { id: "cob-in-p1_53", name: "P1.53", prices: { gold: 8700, platinum: 9550, diamond: 10800 } },
        { id: "cob-in-p1_86", name: "P1.8", prices: { gold: 5800, platinum: 6450, diamond: 7420 } },
      ],
    },
  },

  // Brand-specific module prices. `modelGroups[*].prices` remains the Lampro/default price.
  // Edit any value here independently; the calculator does not apply a fixed markup.
  moduleBrandPrices: {
    Leyard: {
      "smd-in-p1_25": { gold: 9550, platinum: 10750, diamond: 11750 },
      "smd-in-p1_53": { gold: 6332, platinum: 7365, diamond: 9728 },
      "smd-in-p1_86": { gold: 4270, platinum: 5100, diamond: 5650 },
      "smd-in-p2": { gold: 3250, platinum: 3650, diamond: 4050 },
      "smd-in-p2_5": { gold: 2600, platinum: 2950, diamond: 3410 },
      "smd-in-p3": { gold: 3100, platinum: 3850, diamond: 4150 },
      "smd-out-p2_5": { gold: 6750, platinum: 7450, diamond: 8350 },
      "smd-out-p3": { gold: 2868, platinum: 3487, diamond: 3877 },
      "smd-out-p3.91": { gold: 3750, platinum: 4500, diamond: 5270 },
      "smd-out-p4": { gold: 3000, platinum: 3750, diamond: 5450 },
      "smd-out-p5": { gold: 2600, platinum: 3300, diamond: 4250 },
      "smd-out-p6": { gold: 2110, platinum: 2248, diamond: 2477 },
      "smd-out-p6_67": { gold: 2455, platinum: 2615, diamond: 2890 },
      "smd-out-p8": { gold: 2179, platinum: 2294, diamond: 2477 },
      "smd-out-p10": { gold: 1927, platinum: 1996, diamond: 2133 },
      "gob-in-p1_25": { gold: 6050, platinum: 6700, diamond: 7450 },
      "gob-in-p1_53": { gold: 4850, platinum: 5600, diamond: 6570 },
      "gob-in-p1_86": { gold: 4600, platinum: 5075, diamond: 5926 },
      "gob-in-p2": { gold: 3868, platinum: 4643, diamond: 5418 },
      "gob-in-p2.5": { gold: 3200, platinum: 3900, diamond: 4350 },
      "gob-in-p3": { gold: 4250, platinum: 4950, diamond: 5400 },
      "cob-in-p1_25": { gold: 12750, platinum: 13500, diamond: 14250 },
      "cob-in-p1_53": { gold: 8950, platinum: 9800, diamond: 11050 },
      "cob-in-p1_86": { gold: 6050, platinum: 6700, diamond: 7670 },
    },
  },

  // Brands listed here inherit every Lampro model with this Gold-price markup.
  moduleBrandGoldAdjustments: {
    Absen: 150,
  },

  controllers: [
    { id: "WF1", label: "Control Card WF1", price: 562 },
    { id: "WF2", label: "Control Card WF2", price: 687 },
    { id: "WF4", label: "Control Card WF4", price: 1109 },
    { id: "A3L", label: "Crontoller: HD-A3L", price: 23400 },
    { id: "A5L", label: "Crontoller: HD-A5L", price: 30500 },
    { id: "A6L", label: "Crontoller: HD-A6L", price: 4300 },
    { id: "C16L", label: "C16L Controller", price: 18000 },
    { id: "VP210H", label: "Video Processor: HD VP210H", price: 27600 },
    { id: "VP410H", label: "Video Processor: HD VP410H", price: 33000 },
    { id: "VP630", label: "Video Processor: HD-VP630 ", price: 79000 },
    { id: "VP830", label: "Video Processor: HD VP830", price: 109000 },
    { id: "VP1240A", label: "HD VP1240A", price: 138000 },
    { id: "VP1220S", label: "HD VP1220S", price: 85025 },
    { id: "VP1620S", label: "HD VP1620S", price: 150000 },
    { id: "VP1640A", label: "HD VP1640A", price: 166800 },
  ],

ctrlCap: {
    indoor: [
      { id: "VP210H", max: 1200000 },
      { id: "VP410H", max: 2500000 },
      { id: "VP630", max: 3750000 },
      { id: "VP830", max: 5050000 },
      { id: "VP1240A", max: 7550000 },
      { id: "VP1640A", max: 9940000 },
    ],
    outdoor: [
      { id: "A3L", max: 550000 },
      { id: "A5L", max: 1150000 },
      { id: "A6L", max: 2500000 },
    ],
  },


  powerSupplyPrice: 1600,
  powerSupplyBrands: [
    { value: "Lampro", label: "Lampro" },
    { value: "G-Energy", label: "G-Energy" },
    { value: "Mean well", label: "Mean well" },
  ],

  priceTiers: [
    { id: "gold", label: "Gold", note: "Standard", warrantyYears: 1 },
    { id: "platinum", label: "Platinum", note: "15% premium", warrantyYears: 2 },
    { id: "diamond", label: "Diamond", note: "25% premium", warrantyYears: 3 },
  ],

  technologiesAll: [
    { id: "smd", label: "SMD" },
    { id: "gob", label: "GOB" },
    { id: "cob", label: "COB" },
  ],

  paymentTerms: [
    { id: "PT_100", label: "100% Advance" },
    { id: "PT_75_25", label: "75% Advance, 25% before Installation" },
    { id: "PT_50_50", label: "50% Advance, 50% before Installation" },
    { id: "PT_NO_ADV_7D", label: "No Advance, pay within 7 days of Delivery" },
  ],

  moduleBrands: [
    { value: "Lampro", label: "Lampro" },
    { value: "Leyard", label: "Leyard" },
    { value: "Absen", label: "Absen" },
  ],

  controllerSystemBrands: [
    { value: "Huidu", label: "Huidu" },
    { value: "Novastar", label: "Novastar" },
  ],

  novastarControllers: [
    { id: "NS_TB1", label: "Controller: TB-1", price: 21000 },
    { id: "NS_TB2", label: "Controller: TB-20 Plus", price: 34000 },
    { id: "NS_TB40", label: "Controller: TB-40", price: 40000 },
    { id: "NS_TB50", label: "Controller: TB-50", price: 57000 },
    { id: "NS_TB60", label: "Controller: TB-60", price: 75500 },
    { id: "NS_TU15PRO", label: "Controller: TU-15 Pro", price: 150000},
    { id: "NS_TU20PRO", label: "Controller: TU-20 Pro", price: 180000 },
    { id: "NS_TU40PRO", label: "Controller: TU-40 Pro", price: 312000 },
    { id: "NS_DSP400", label: "Video Processor: DSP-400", price: 198000 },
    { id: "NS_DSP600", label: "Video Processor: DSP-600 Pro", price: 215000 },
    { id: "NS_DSP1000", label: "Video Processor: DSP-1000 Pro", price: 280000 },
    { id: "NS_DSP2000", label: "Video Processor: VX2000 Pro", price: 560000 },
  ],

  novastarCtrlCap: {
    indoor: [
      { id: "NS_TB2", max: 0 },
      { id: "NS_TB40", max: 0 },
      { id: "NS_TB50", max: 0 },
      { id: "NS_TB60", max: 0 },
      { id: "NS_TU15PRO", max: 2400000 },
      { id: "NS_TU20PRO", max: 3750000 },
      { id: "NS_TU40PRO", max: 12800000 },
      { id: "NS_DSP400", max: 2450000 },
      { id: "NS_DSP600", max: 3800000 },
      { id: "NS_DSP1000", max: 6300000 },
      { id: "NS_DSP2000", max: 12820000 },
    ],
    outdoor: [
      { id: "NS_TB1", max: 0 },
      { id: "NS_TB2", max: 550000 },
      { id: "NS_TB40", max: 1150000 },
      { id: "NS_TB50", max: 0 },
      { id: "NS_TB60", max: 2200000 },
      { id: "NS_TU15PRO", max: 2400000 },
      { id: "NS_TU20PRO", max: 3750000 },
      { id: "NS_TU40PRO", max: 12800000 },
      { id: "NS_DSP400", max: 2450000 },
      { id: "NS_DSP600", max: 3800000 },
      { id: "NS_DSP1000", max: 6300000 },
      { id: "NS_DSP2000", max: 12820000 },
    ],
  },

  receivingCards: {
    NS_NV3210: { label: "Receiving Card: NV3210", unitPrice: 4000, pin: 26 },
    NS_NV7512: { label: "Receiving Card: NV7512", unitPrice: 2900, pin: 16 },
    NS_A5S_26: { label: "Receiving Card: A5s Plus", unitPrice: 3100, pin: 26 },
    NS_A5S_16: { label: "Receiving Card: A5s Plus", unitPrice: 2600, pin: 16 },
    R732: { label: "Receiving Card: R-732", unitPrice: 2950, cobUnitPrice: 2900 },
    R712: { label: "Receiving Card: R-712", unitPrice: 2500 },
  },

  cabinetCasePrice: CABINET_DEFAULT_PRICE,
  modulesPerCabinet: 6,
  cabinetOptions: [...INDOOR_CABINET_OPTIONS, ...OUTDOOR_CABINET_OPTIONS],
  cabinetSizes: [
    { id: "cabinet_640x480", label: "640mm x 480mm", widthMm: 640, heightMm: 480, modulesPerCabinet: 6 },
    { id: "cabinet_640x640", label: "640mm x 640mm", widthMm: 640, heightMm: 640, modulesPerCabinet: 8 },
  ],

  physical: {
    ft320: 1.0499,
    ft160: 0.5249,
    ft192: 0.6299,
    ft250: 0.8202,
  },

  moduleRes: {
    "1.25": { pxW: 256, pxH: 128 },
    "1.53": { pxW: 210, pxH: 105 },
    "1.667": { pxW: 192, pxH: 96 },
    "1.86": { pxW: 172, pxH: 86 },
    "2": { pxW: 160, pxH: 80 },
    "2.5": { pxW: 128, pxH: 64 },
    "3": { pxW: 64, pxH: 64 },
    "3.076": { pxW: 104, pxH: 52 },
    "3.91": { pxW: 64, pxH: 64 },
    "4": { pxW: 80, pxH: 40 },
    "5": { pxW: 64, pxH: 32 },
    "6": { pxW: 32, pxH: 32 },
    "6.67": { pxW: 48, pxH: 24 },
    "8": { pxW: 40, pxH: 20 },
    "10": { pxW: 32, pxH: 16 },
  },

  rcCapacityHuidu: {
    indoor: { "1.25": 3, "1.53": 4, "1.667": 5, "1.86": 6, "2": 10, "2.5": 10, "3": 12, "3.076": 16, "4": 16, "5": 16 },
    outdoor: { "2.5": 10, "3": 12, "3.076": 16, "3.91": 4, "4": 16, "5": 16, "6": 24, "6.67": 24, "8": 30, "10": 32 },
  },

  rcCapacityNovastar: {
    indoor: { "1.25": 3, "1.53": 4, "1.667": 5, "1.86": 6, "2": 10, "2.5": 10, "3": 12, "3.076": 16, "4": 16, "5": 16 },
    outdoor: { "2.5": 10, "3": 12, "3.076": 16, "3.91": 4, "4": 16, "5": 16, "6": 24, "6.67": 24, "8": 30, "10": 32 },
  },

  psuCapacity: {
    indoor: { "1.25": 4, "1.53": 4, "1.667": 4, "1.86": 5, "2": 6, "2.5": 6, "3": 6, "3.076": 6, "4": 6, "5": 6 },
    outdoor: { "2.5": 6, "3": 6, "3.076": 6, "3.91": 6, "4": 6, "5": 6, "6": 6, "6.67": 6, "6.7": 6, "8": 6, "10": 6 },
  },



  psuModelLabel: "N200V5-A (5V40A)",
};

export function getCabinetFootprintFt(physical, cabinetSizeId = "cabinet_indoor_aluminium_640x480", cabinetOptions = []) {
  const p = physical || componentModelAndPrice.physical;
  const option = (cabinetOptions?.length ? cabinetOptions : componentModelAndPrice.cabinetOptions).find(
    (cabinet) => cabinet.id === cabinetSizeId
  );

  if (option?.widthMm && option?.heightMm) {
    return { w: option.widthMm / 304.8, h: option.heightMm / 304.8 };
  }

  if (cabinetSizeId === "cabinet_640x640") return { w: p.ft320 * 2, h: p.ft320 * 2 };
  return { w: p.ft320 * 2, h: p.ft160 * 3 };
}
