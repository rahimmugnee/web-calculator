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
    powerSupplyBrands: ["Lampro"],
    powerSupplyPrice: 500,
  };
  const rows = [
    { component_type: "module", source_key: "led:module:lampro:p1", brand_name: "Lampro", price_tier: "gold", unit_price: "110", technical_metadata: { id: "p1", technology: "smd", location: "indoor" } },
    { component_type: "module", source_key: "led:module:absen:p1", brand_name: "Absen", price_tier: "gold", unit_price: "120", technical_metadata: { id: "p1", technology: "smd", location: "indoor" } },
    { component_type: "controller", model: "C1", price_tier: "default", unit_price: "210", technical_metadata: { id: "C1" } },
    { component_type: "receiving-card", model: "R1", price_tier: "default", unit_price: "310", technical_metadata: { id: "R1" } },
    { component_type: "cabinet", model: "CAB1", price_tier: "default", unit_price: "410", technical_metadata: { id: "CAB1" } },
    { component_type: "power-supply", brand_name: "Lampro", price_tier: "default", unit_price: "510" },
  ];

  const catalog = applyLedPriceRows(base, rows);

  expect(catalog.modelGroups.smd.indoor[0].prices).toEqual({ default: 110 });
  expect(catalog.moduleBrandPrices.Lampro.p1).toEqual({ default: 110 });
  expect(catalog.moduleBrandPrices.Absen.p1).toEqual({ default: 120 });
  expect(catalog.controllers[0].price).toBe(210);
  expect(catalog.receivingCards.R1.unitPrice).toBe(310);
  expect(catalog.cabinetOptions[0].price).toBe(410);
  expect(catalog.powerSupplyPrice).toBe(510);
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

test.each([
  ["default then gold", false],
  ["gold then default", true],
])("prefers defaults for other base-price components: %s", (_label, reverse) => {
  const base = {
    controllers: [{ id: "C1", price: 1 }],
    cabinetOptions: [{ id: "CAB1", price: 2 }],
    powerSupplyBrands: ["Lampro"],
    powerSupplyPrice: 3,
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
      { component_type: "power-supply", source_key: "led:power-supply:default", brand_name: "Lampro", price_tier: "default", unit_price: 510 },
      { component_type: "power-supply", source_key: "led:power-supply:default", brand_name: "Lampro", price_tier: "gold", unit_price: 310 },
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
  expect(catalog.powerSupplyPrice).toBe(510);
  expect(catalog.powerSupplyPrices.Lampro).toBe(510);
  expect(catalog.receivingCards.R1).toMatchObject({ unitPrice: 310, cobUnitPrice: 610 });
});
