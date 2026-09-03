import { applyLedPriceRows } from "./apply-led-price-rows";

test("overlays every LED component price without mutating factory defaults", () => {
  const base = {
    modelGroups: { smd: { indoor: [{ id: "p1", name: "P1", prices: { gold: 100 } }] } },
    moduleBrandPrices: {},
    moduleBrands: [{ value: "Lampro", label: "Lampro" }],
    controllers: [{ id: "C1", price: 200 }],
    novastarControllers: [],
    receivingCards: { R1: { label: "R1", unitPrice: 300 } },
    cabinetOptions: [{ id: "CAB1", price: 400 }],
    powerSupplies: [{ id: "PS1", model: "PSU-BASE", label: "Power Supply: PSU-BASE", price: 500, brand: "Lampro", unit: "Pcs" }],
  };
  const rows = [
    { component_type: "module", source_key: "led:module:lampro:p1", name: "P 1 SMD indoor LED Display Module", model: "LC1P", unit: "Box", brand_name: "Lampro", price_tier: "gold", unit_price: "110", technical_metadata: { id: "p1", technology: "smd", location: "indoor" } },
    { component_type: "module", source_key: "led:module:absen:p1", brand_name: "Absen", price_tier: "gold", unit_price: "120", technical_metadata: { id: "p1", technology: "smd", location: "indoor" } },
    { component_type: "controller", name: "Video Controller", model: "CTRL-DB", unit: "Set", brand_name: "ControlBrand", price_tier: "default", unit_price: "210", technical_metadata: { id: "C1" } },
    { component_type: "receiving-card", name: "Data Receiver", model: "RC-DB", unit: "Card", brand_name: "ReceiverBrand", price_tier: "default", unit_price: "310", technical_metadata: { id: "R1" } },
    { component_type: "cabinet", name: "LED Case", model: "CAB-DB", unit: "Case", brand_name: "CaseBrand", price_tier: "default", unit_price: "410", technical_metadata: { id: "CAB1" } },
    { component_type: "power-supply", source_key: "led:power-supply:PS1", name: "LED PSU", model: "PSU-DB", unit: "Unit", brand_name: "Lampro", price_tier: "default", unit_price: "510", technical_metadata: { id: "PS1" } },
  ];

  const catalog = applyLedPriceRows(base, rows);

  expect(catalog.modelGroups.smd.indoor[0].prices).toEqual({ default: 110 });
  expect(catalog.moduleBrandPrices.Lampro.p1).toEqual({ default: 110 });
  expect(catalog.moduleBrandLabels.Lampro.p1).toBe("P 1 SMD indoor LED Display Module");
  expect(catalog.moduleBrandModelNames.Lampro.p1).toBe("LC1P");
  expect(catalog.moduleBrandDetails.Lampro.p1).toEqual({
    itemName: "P 1 SMD indoor LED Display Module", brand: "Lampro", model: "LC1P", unit: "Box",
  });
  expect(catalog.moduleBrandPrices.Absen.p1).toEqual({ default: 120 });
  expect(catalog.controllers[0].price).toBe(210);
  expect(catalog.controllers[0]).toMatchObject({ itemName: "Video Controller", brand: "ControlBrand", model: "CTRL-DB", unit: "Set" });
  expect(catalog.receivingCards.R1.unitPrice).toBe(310);
  expect(catalog.receivingCards.R1).toMatchObject({ itemName: "Data Receiver", brand: "ReceiverBrand", model: "RC-DB", unit: "Card" });
  expect(catalog.cabinetOptions[0].price).toBe(410);
  expect(catalog.cabinetOptions[0]).toMatchObject({ itemName: "LED Case", brand: "CaseBrand", model: "CAB-DB", unit: "Case" });
  expect(catalog.powerSupplies[0]).toEqual({ id: "PS1", label: "LED PSU", price: 510, itemName: "LED PSU", brand: "Lampro", model: "PSU-DB", unit: "Unit" });
  expect(base.modelGroups.smd.indoor[0].prices.gold).toBe(100);
});

const productionModuleRows = [
  { component_type: "module", source_key: "led:module:lampro:cob-in-p1_25", brand_name: "Lampro", price_tier: "default", unit_price: "14500", technical_metadata: { id: "cob-in-p1_25", technology: "cob", location: "indoor" } },
  { component_type: "module", source_key: "led:module:lampro:cob-in-p1_25", brand_name: "Lampro", price_tier: "gold", unit_price: "12500", technical_metadata: { id: "cob-in-p1_25", technology: "cob", location: "indoor" } },
];

test.each([
  ["default then gold", productionModuleRows],
  ["gold then default", [...productionModuleRows].reverse()],
])("prefers a module default price regardless of row order: %s", (_label, rows) => {
  const catalog = applyLedPriceRows({}, rows);

  expect(catalog.moduleBrandPrices.Lampro["cob-in-p1_25"].default).toBe(14500);
  expect(catalog.modelGroups.cob.indoor[0].prices.default).toBe(14500);
});

test("uses a legacy gold module price when no default row exists", () => {
  const catalog = applyLedPriceRows({}, [productionModuleRows[1]]);

  expect(catalog.moduleBrandPrices.Lampro["cob-in-p1_25"].default).toBe(12500);
});

test("keeps Novastar internal ids separate from invoice models", () => {
  const base = {
    controllers: [],
    novastarControllers: [{ id: "NS_TU15PRO", model: "TU-15 Pro", label: "Controller: TU-15 Pro", price: 1 }],
    receivingCards: { NS_NV3210: { model: "NV3210", label: "Receiving Card: NV3210", unitPrice: 1 } },
  };
  const rows = [
    { component_type: "controller", model: "NS_TU15PRO", price_tier: "default", unit_price: 150000, technical_metadata: { id: "NS_TU15PRO" } },
    { component_type: "receiving-card", model: "NS_NV3210", price_tier: "default", unit_price: 4000, technical_metadata: { id: "NS_NV3210" } },
  ];

  const catalog = applyLedPriceRows(base, rows);

  expect(catalog.novastarControllers[0]).toMatchObject({ id: "NS_TU15PRO", model: "TU-15 Pro" });
  expect(catalog.receivingCards.NS_NV3210).toMatchObject({ model: "NV3210" });
});

test("keeps every power-supply model and label attached to its stable id", () => {
  const base = {
    powerSupplies: [
      { id: "PS_LD200", model: "LD-200", label: "Power Supply: LD-200", price: 1, brand: "Lampro" },
      { id: "PS_LRS200", model: "LRS-200", label: "Power Supply: LRS-200", price: 1, brand: "Mean well" },
      { id: "PS_N200V5A", model: "N200V5-A", label: "Power Supply: N200V5-A", price: 1, brand: "G-Energy" },
    ],
  };
  const rows = [
    { component_type: "power-supply", source_key: "led:power-supply:PS_N200V5A", name: "Power Supply: N200V5-A", model: "N200V5-A", brand_name: "G-Energy", price_tier: "default", unit_price: 1800, technical_metadata: { id: "PS_N200V5A" } },
    { component_type: "power-supply", source_key: "led:power-supply:PS_LD200", name: "Power Supply: LD-200", model: "LD-200", brand_name: "Lampro", price_tier: "default", unit_price: 1600, technical_metadata: { id: "PS_LD200" } },
    { component_type: "power-supply", source_key: "led:power-supply:PS_LRS200", name: "Power Supply: LRS-200", model: "LRS-200", brand_name: "Mean well", price_tier: "default", unit_price: 1700, technical_metadata: { id: "PS_LRS200" } },
  ];

  const catalog = applyLedPriceRows(base, rows);

  expect(catalog.powerSupplies).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: "PS_LD200", brand: "Lampro", model: "LD-200", label: "Power Supply: LD-200", price: 1600 }),
    expect.objectContaining({ id: "PS_LRS200", brand: "Mean well", model: "LRS-200", label: "Power Supply: LRS-200", price: 1700 }),
    expect.objectContaining({ id: "PS_N200V5A", brand: "G-Energy", model: "N200V5-A", label: "Power Supply: N200V5-A", price: 1800 }),
  ]));
});

test.each([
  ["default then gold", false],
  ["gold then default", true],
])("prefers defaults for other base-price components: %s", (_label, reverse) => {
  const base = {
    controllers: [{ id: "C1", price: 1 }],
    cabinetOptions: [{ id: "CAB1", price: 2 }],
    powerSupplies: [{ id: "PS1", model: "PSU", label: "Power Supply: PSU", price: 3, brand: "Lampro", unit: "Pcs" }],
    receivingCards: { R1: { label: "R1", unitPrice: 4, cobUnitPrice: 5 } },
  };
  const pairs = [
    [
      { component_type: "controller", source_key: "led:controller:C1", model: "C1", price_tier: "default", unit_price: 210, technical_metadata: { id: "C1" } },
      { component_type: "controller", source_key: "led:controller:C1", model: "C1", price_tier: "gold", unit_price: 110, technical_metadata: { id: "C1" } },
    ],
    [
      { component_type: "cabinet", source_key: "led:cabinet:CAB1", model: "CAB1", price_tier: "default", unit_price: 410, technical_metadata: { id: "CAB1" } },
      { component_type: "cabinet", source_key: "led:cabinet:CAB1", model: "CAB1", price_tier: "gold", unit_price: 310, technical_metadata: { id: "CAB1" } },
    ],
    [
      { component_type: "power-supply", source_key: "led:power-supply:PS1", brand_name: "Lampro", price_tier: "default", unit_price: 510, technical_metadata: { id: "PS1" } },
      { component_type: "power-supply", source_key: "led:power-supply:PS1", brand_name: "Lampro", price_tier: "gold", unit_price: 310, technical_metadata: { id: "PS1" } },
    ],
  ];
  const rows = pairs.flatMap((pair) => reverse ? [...pair].reverse() : pair);
  rows.push(
    { component_type: "receiving-card", source_key: "led:receiving-card:R1", model: "R1", price_tier: "default", unit_price: 310, technical_metadata: { id: "R1" } },
    { component_type: "receiving-card", source_key: "led:receiving-card:R1", model: "R1", price_tier: "cob", unit_price: 610, technical_metadata: { id: "R1" } },
  );

  const catalog = applyLedPriceRows(base, rows);

  expect(catalog.controllers[0].price).toBe(210);
  expect(catalog.cabinetOptions[0].price).toBe(410);
  expect(catalog.powerSupplies[0].price).toBe(510);
  expect(catalog.receivingCards.R1).toMatchObject({ unitPrice: 310, cobUnitPrice: 610 });
});
