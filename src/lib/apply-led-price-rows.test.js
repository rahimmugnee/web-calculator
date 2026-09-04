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
  const cabinetModel = catalog.cabinetOptions.find((item) => item.catalogRole === "model");
  expect(cabinetModel.price).toBe(410);
  expect(cabinetModel).toMatchObject({ itemName: "LED Case", brand: "CaseBrand", model: "CAB-DB", unit: "Case" });
  expect(catalog.powerSupplies[0]).toEqual({ id: "PS1", label: "LED PSU", price: 510, itemName: "LED PSU", brand: "Lampro", model: "PSU-DB", unit: "Unit" });
  expect(base.modelGroups.smd.indoor[0].prices.gold).toBe(100);
});

test("keeps an admin cabinet with a blank model as No Model", () => {
  const catalog = applyLedPriceRows({ cabinetOptions: [] }, [{
    component_type: "cabinet",
    source_key: "admin:1:no-model-cabinet",
    source_catalog: "admin",
    name: "Cabinet 640x480",
    model: "",
    price_tier: "default",
    unit_price: 400,
    technical_metadata: { id: "no-model-cabinet", displayType: "indoor", materialCode: "aluminium", sizeKey: "640x480" },
  }]);

  expect(catalog.cabinetOptions[0]).toMatchObject({
    id: "admin:1:no-model-cabinet",
    model: "",
    catalogRole: "model",
  });
});

test("keeps an edited seeded cabinet as a base while exposing its brand-only product", () => {
  const catalog = applyLedPriceRows({}, [{
    component_type: "cabinet",
    source_key: "led:cabinet:aluminium-indoor-640x480",
    source_catalog: "admin",
    name: "Aluminium 640mm x 480mm",
    model: "",
    brand_name: "ABC",
    price_tier: "default",
    unit_price: 8000,
    technical_metadata: {
      id: "aluminium-indoor-640x480",
      displayType: "indoor",
      materialCode: "aluminium",
      sizeKey: "640x480",
    },
  }], [], { authoritative: true });

  expect(catalog.cabinetOptions).toHaveLength(2);
  expect(catalog.cabinetOptions.find((item) => item.catalogRole === "base")).toMatchObject({
    id: "aluminium-indoor-640x480",
    sourceKey: "led:cabinet:aluminium-indoor-640x480",
    sourceCatalog: "admin",
    catalogRole: "base",
    brand: "",
    model: "",
  });
  expect(catalog.cabinetOptions.find((item) => item.catalogRole === "model")).toMatchObject({
    id: "led:cabinet:aluminium-indoor-640x480",
    brand: "ABC",
    model: "",
  });
});

test("applies database cabinet metadata edits to an existing base option", () => {
  const catalog = applyLedPriceRows({ cabinetOptions: [{
    id: "cabinet-base",
    catalogRole: "base",
    displayType: "indoor",
    materialCode: "aluminium",
    sizeKey: "640x480",
    price: 8000,
  }] }, [{
    component_type: "cabinet",
    source_key: "led:cabinet:cabinet-base",
    source_catalog: "admin",
    name: "Outdoor Magnesium Cabinet",
    model: "",
    price_tier: "default",
    unit_price: 9200,
    technical_metadata: {
      id: "cabinet-base",
      displayType: "outdoor",
      materialCode: "magnesium",
      sizeKey: "960x960",
      widthMm: 960,
      heightMm: 960,
    },
  }]);

  expect(catalog.cabinetOptions).toEqual([expect.objectContaining({
    id: "cabinet-base",
    catalogRole: "base",
    displayType: "outdoor",
    materialCode: "magnesium",
    sizeKey: "960x960",
    widthMm: 960,
    heightMm: 960,
    price: 9200,
  })]);
});

test("keeps same-named admin cabinet models as distinct selectable records", () => {
  const collidingBaseId = "aluminium-indoor-640x480";
  const sharedCustomModel = {
    component_type: "cabinet",
    source_catalog: "admin",
    model: "CAB-X",
    price_tier: "default",
    unit_price: 400,
    technical_metadata: {
      id: collidingBaseId,
      displayType: "indoor",
      materialCode: "aluminium",
      sizeKey: "640x480",
    },
  };
  const catalog = applyLedPriceRows({}, [
    {
      component_type: "cabinet",
      source_key: `led:cabinet:${collidingBaseId}`,
      source_catalog: "static-js",
      name: "Aluminium 640mm x 480mm",
      model: "",
      brand_name: "",
      price_tier: "default",
      unit_price: 8000,
      technical_metadata: {
        id: collidingBaseId,
        displayType: "indoor",
        materialCode: "aluminium",
        sizeKey: "640x480",
      },
    },
    { ...sharedCustomModel, source_key: "admin:1:cab-x", brand_name: "CaseCo" },
    { ...sharedCustomModel, source_key: "admin:2:cab-x", brand_name: "OtherCo" },
  ], [], { authoritative: true });

  expect(catalog.cabinetOptions).toHaveLength(3);
  expect(catalog.cabinetOptions).toEqual(expect.arrayContaining([
    expect.objectContaining({ id: collidingBaseId, catalogRole: "base", brand: "", model: "" }),
    expect.objectContaining({ id: "admin:1:cab-x", catalogRole: "model", brand: "CaseCo", model: "CAB-X" }),
    expect.objectContaining({ id: "admin:2:cab-x", catalogRole: "model", brand: "OtherCo", model: "CAB-X" }),
  ]));
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

test("removes database-deleted LED components when live rows are authoritative", () => {
  const base = {
    modelGroups: { smd: { indoor: [{ id: "deleted-module", name: "P2", prices: { default: 1 } }] } },
    moduleBrandPrices: { Lampro: { "deleted-module": { default: 1 } } },
    moduleBrands: [{ value: "Lampro", label: "Lampro" }],
    controllers: [{ id: "deleted-controller", price: 1 }],
    novastarControllers: [],
    receivingCards: { "deleted-card": { unitPrice: 1 } },
    cabinetOptions: [{ id: "deleted-cabinet", price: 1 }],
    powerSupplies: [{ id: "deleted-supply", price: 1 }],
  };

  const catalog = applyLedPriceRows(base, [], [], { authoritative: true });

  expect(catalog.modelGroups).toEqual({});
  expect(catalog.moduleBrands).toEqual([]);
  expect(catalog.controllers).toEqual([]);
  expect(catalog.receivingCards).toEqual({});
  expect(catalog.cabinetOptions).toEqual([]);
  expect(catalog.powerSupplies).toEqual([]);
});

test("rebuilds restored LED components from authoritative database metadata", () => {
  const rows = [
    { component_type: "controller", source_key: "led:controller:C2", name: "Controller: C2", model: "C2", brand_name: "Huidu", price_tier: "default", unit_price: 200, technical_metadata: { id: "C2", pixels: 2000000 } },
    { component_type: "receiving-card", source_key: "led:receiving-card:R2", name: "Receiving Card: R2", model: "R2", brand_name: "Huidu", price_tier: "default", unit_price: 300, technical_metadata: { id: "R2" } },
    { component_type: "cabinet", source_key: "led:cabinet:CAB2", name: "Cabinet 640x480", model: "CAB2", price_tier: "default", unit_price: 400, technical_metadata: { id: "CAB2", widthMm: 640, heightMm: 480 } },
    { component_type: "power-supply", source_key: "led:power-supply:PS2", name: "Power Supply: PS2", model: "PS2", brand_name: "Lampro", price_tier: "default", unit_price: 500, technical_metadata: { id: "PS2" } },
  ];

  const catalog = applyLedPriceRows({}, rows, [], { authoritative: true });

  expect(catalog.controllers[0]).toMatchObject({ id: "C2", model: "C2", price: 200, pixels: 2000000 });
  expect(catalog.receivingCards.R2).toMatchObject({ id: "R2", model: "R2", unitPrice: 300 });
  expect(catalog.cabinetOptions[0]).toMatchObject({ id: "CAB2", model: "", catalogRole: "base", price: 400, widthMm: 640 });
  expect(catalog.powerSupplies[0]).toMatchObject({ id: "PS2", model: "PS2", price: 500 });
});

test("keeps module pitches and cabinet variants in deterministic display order", () => {
  const rows = [
    { component_type: "module", source_key: "led:module:lampro:smd-in-p2", brand_name: "Lampro", price_tier: "default", unit_price: 100, technical_metadata: { id: "smd-in-p2", technology: "smd", location: "indoor" } },
    { component_type: "module", source_key: "led:module:lampro:smd-in-p1_25", model: "LC1.25P", brand_name: "Lampro", price_tier: "default", unit_price: 100, technical_metadata: { id: "smd-in-p1_25", technology: "smd", location: "indoor" } },
    { component_type: "cabinet", source_key: "led:cabinet:ms-back", model: "MS640X480", price_tier: "default", unit_price: 100, technical_metadata: { id: "ms-back", displayType: "outdoor", materialCode: "mild_steel", variantCode: "backdoor", sizeKey: "640x480" } },
    { component_type: "cabinet", source_key: "led:cabinet:al-indoor", model: "AL640X480", price_tier: "default", unit_price: 100, technical_metadata: { id: "al-indoor", displayType: "indoor", materialCode: "aluminium", sizeKey: "640x480" } },
    { component_type: "cabinet", source_key: "led:cabinet:ms-open", model: "MS640X480", price_tier: "default", unit_price: 100, technical_metadata: { id: "ms-open", displayType: "outdoor", materialCode: "mild_steel", variantCode: "open", sizeKey: "640x480" } },
  ];

  const catalog = applyLedPriceRows({}, rows, [], { authoritative: true });

  expect(catalog.modelGroups.smd.indoor.map(({ id }) => id)).toEqual(["smd-in-p1_25", "smd-in-p2"]);
  expect(catalog.modelGroups.smd.indoor[0].name).toBe("P1.25");
  expect(catalog.cabinetOptions.map(({ id }) => id)).toEqual(["al-indoor", "ms-open", "ms-back"]);
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
