/**
 * Single source of truth for component prices, models, controller max pixels,
 * receiving cards, cabinet sizes, and related quotation defaults.
 * Edit this file first, then run `npm run sync-catalog` to refresh
 * `/public/quotation-catalog.json` for fetch-based clients.
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

export const componentPrice = {
  schemaVersion: 1,

  modelGroups: {
    smd: {
      indoor: [
        { id: "smd-in-p1_25", name: "P1.25", prices: { gold: 9300, platinum: 10500, diamond: 11500 } },
        { id: "smd-in-p1_53", name: "P1.53", prices: { gold: 6082, platinum: 7115, diamond: 9478 } },
        { id: "smd-in-p1_86", name: "P1.8", prices: { gold: 4020, platinum: 4850, diamond: 5400 } },
        { id: "smd-in-p2", name: "P2", prices: { gold: 3000, platinum: 3400, diamond: 3800 } },
        { id: "smd-in-p2_5", name: "P2.5", prices: { gold: 2145, platinum: 2500, diamond: 2860 } },
        { id: "smd-in-p3", name: "P3", prices: { gold: 1445, platinum: 1840, diamond: 2550 } },
      ],
      outdoor: [
        { id: "smd-out-p2_5", name: "P2.5", prices: { gold: 6500, platinum: 7200, diamond: 8100 } },
        { id: "smd-out-p3", name: "P3", prices: { gold: 2618, platinum: 3237, diamond: 3627 } },
        { id: "smd-out-p3.91", name: "P3.91", prices: { gold: 3500, platinum: 4250, diamond: 5020 } },
        { id: "smd-out-p4", name: "P4", prices: { gold: 2500, platinum: 2939, diamond: 3214 } },
        { id: "smd-out-p5", name: "P5", prices: { gold: 2170, platinum: 2500, diamond: 2950 } },
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
        { id: "gob-in-p1_86", name: "P1.8", prices: { gold: 3973, platinum: 4825, diamond: 5676 } },
        { id: "gob-in-p2", name: "P2", prices: { gold: 3618, platinum: 4393, diamond: 5168 } },
        { id: "gob-in-p2.5", name: "P2.5", prices: { gold: 3200, platinum: 3800, diamond: 4500 } },
      ],
    },
    cob: {
      indoor: [
        { id: "cob-in-p1_25", name: "P1.25", prices: { gold: 11550, platinum: 12700, diamond: 8900 } },
        { id: "cob-in-p1_53", name: "P1.53", prices: { gold: 6550, platinum: 7350, diamond: 7800 } },
        { id: "cob-in-p1_86", name: "P1.8", prices: { gold: 4820, platinum: 6050, diamond: 6650 } },
      ],
    },
  },

  controllers: [
    { id: "WF1", label: "Control Card WF1", price: 562 },
    { id: "WF2", label: "Control Card WF2", price: 687 },
    { id: "WF4", label: "Control Card WF4", price: 1109 },
    { id: "A3L", label: "Crontoller: HD-A3L", price: 19200 },
    { id: "A5L", label: "Crontoller: HD-A5L", price: 25400 },
    { id: "A6L", label: "Crontoller: HD-A6L", price: 39400 },
    { id: "C16L", label: "C16L Controller", price: 18000 },
    { id: "VP210H", label: "Video Processor: HD VP210H", price: 22995 },
    { id: "VP410H", label: "Video Processor: HD VP410H", price: 27500 },
    { id: "VP630", label: "Video Processor: HD-VP630 ", price: 65940 },
    { id: "VP830", label: "Video Processor: HD VP830", price: 90790 },
    { id: "VP1240A", label: "HD VP1240A", price: 114845 },
    { id: "VP1220S", label: "HD VP1220S", price: 85025 },
    { id: "VP1620S", label: "HD VP1620S", price: 94965 },
    { id: "VP1640A", label: "HD VP1640A", price: 139500 },
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

  novastarControllers: {
    indoor: [
      { id: "NS_TB2", label: "Controller: TB-20 Plus", price: 34000, max: 600000 },
      { id: "NS_TB40", label: "Controller: TB-40", price: 35000, max: 1150000 },
      { id: "NS_TU20PRO", label: "Controller: TU-20 Pro", price: 150000 },
      { id: "NS_TU40PRO", label: "Controller: TU-40 Pro", price: 260000 },
      { id: "NS_DSP400", label: "Video Processor: DSP-400", price: 165000, max: 2500000 },
      { id: "NS_DSP600", label: "Video Processor: DSP-600 Pro", price: 150000, max: 3750000 },
      { id: "NS_DSP1000", label: "Video Processor: DSP-1000 Pro", price: 240000, max: 6300000 },
      { id: "NS_DSP2000", label: "Video Processor: VX2000 Pro", price: 460000, max: 12800000 },
    ],
    outdoor: [
      { id: "NS_TB1", label: "Controller: TB-1", price: 17500 },
      { id: "NS_TB2", label: "Controller: TB-20 Plus", price: 34000, max: 550000 },
      { id: "NS_TB40", label: "Controller: TB-40", price: 35000, max: 1150000 },
      { id: "NS_TU20PRO", label: "Controller: TU-20 Pro", price: 150000, max: 3900000 },
      { id: "NS_TU40PRO", label: "Controller: TU-40 Pro", price: 260000, max: 13000000 },
      { id: "NS_DSP400", label: "Video Processor: DSP-400", price: 165000, max: 2500000 },
      { id: "NS_DSP600", label: "Video Processor: DSP-600 Pro", price: 150000, max: 3750000 },
      { id: "NS_DSP1000", label: "Video Processor: DSP-1000 Pro", price: 240000, max: 6300000 },
    ],
  },

  receivingCards: {
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
    indoor: { "1.25": 4, "1.53": 4, "1.667": 6, "1.86": 8, "2": 10, "2.5": 11, "3": 12, "3.076": 16, "4": 20, "5": 24 },
    outdoor: { "2.5": 10, "3": 12, "3.076": 16, "3.91": 20, "4": 20, "5": 24, "6": 30, "6.67": 36, "8": 40, "10": 40 },
  },

  rcCapacityNovastar: {
    indoor: { "1.25": 4, "1.53": 6, "1.667": 8, "1.86": 8, "2": 11, "2.5": 20, "3": 26, "3.076": 26, "4": 35, "5": 40 },
    outdoor: { "2.5": 8, "3": 11, "3.076": 11, "3.91": 20, "4": 20, "5": 28, "6": 35, "6.67": 50, "8": 70, "10": 80 },
  },

  psuCapacity: {
    indoor: { "1.25": 4, "1.53": 4, "1.667": 4, "1.86": 5, "2": 6, "2.5": 6, "3": 6, "3.076": 6, "4": 6, "5": 6 },
    outdoor: { "2.5": 6, "3": 6, "3.076": 6, "3.91": 6, "4": 6, "5": 6, "6": 6, "6.67": 6, "6.7": 6, "8": 6, "10": 6 },
  },



  psuModelLabel: "N200V5-A (5V40A)",
};

export function getCabinetFootprintFt(physical, cabinetSizeId = "cabinet_indoor_aluminium_640x480", cabinetOptions = []) {
  const p = physical || componentPrice.physical;
  const option = (cabinetOptions?.length ? cabinetOptions : componentPrice.cabinetOptions).find(
    (cabinet) => cabinet.id === cabinetSizeId
  );

  if (option?.widthMm && option?.heightMm) {
    return { w: option.widthMm / 304.8, h: option.heightMm / 304.8 };
  }

  if (cabinetSizeId === "cabinet_640x640") return { w: p.ft320 * 2, h: p.ft320 * 2 };
  return { w: p.ft320 * 2, h: p.ft160 * 3 };
}
