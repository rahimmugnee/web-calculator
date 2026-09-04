import test from "node:test";
import assert from "node:assert/strict";
import { mapStaticCatalog } from "./catalog-mapper.mjs";

test("maps one LED module base price and keeps non-module defaults", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: { smd: { indoor: [{ id: "p2", name: "P2", prices: { gold: 10, diamond: 20 } }] } },
      moduleBrandPrices: {}, controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [],
      powerSupplies: [],
    },
    paProducts: [{ id: "amp", componentType: "amplifier", productName: "Amp", unitPrice: 100 }],
    conferenceProducts: [],
  });
  assert.deepEqual(products.find((item) => item.sourceKey === "led:module:lampro:p2").prices, { default: 10 });
  assert.equal(products.find((item) => item.sourceKey === "pa:amp").prices.default, 100);
  assert.equal(new Set(products.map((item) => item.sourceKey)).size, products.length);
});

test("preserves category-specific fields in metadata", () => {
  const products = mapStaticCatalog({ ledCatalog: { modelGroups: {}, controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplies: [] }, paProducts: [{ id: "x", productName: "X", componentType: "speaker", impedanceOhms: 8, unitPrice: 1 }], conferenceProducts: [] });
  const item = products.find((product) => product.sourceKey === "pa:x");
  assert.equal(item.metadata.impedanceOhms, 8);
});

test("creates every adjusted-brand module with one adjusted base price", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: { smd: { indoor: [
        { id: "p1", name: "P1", prices: { gold: 1000 } },
        { id: "p2", name: "P2", prices: { gold: 2000 } },
      ] } },
      moduleBrandPrices: {}, moduleBrandGoldAdjustments: { Absen: 150 },
      controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplies: [],
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.equal(products.find((item) => item.sourceKey === "led:module:absen:p1").prices.default, 1150);
  assert.equal(products.find((item) => item.sourceKey === "led:module:absen:p2").prices.default, 2150);
});

test("uses brand-specific module model names", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: { smd: { indoor: [{ id: "smd-in-p2", name: "P2", prices: { default: 3000 } }] } },
      moduleBrandPrices: {}, moduleBrandModelNames: { Lampro: { "smd-in-p2": "LC2P" } },
      controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplies: [],
    },
    paProducts: [], conferenceProducts: [],
  });

  const lampro = products.find((item) => item.sourceKey === "led:module:lampro:smd-in-p2");
  assert.equal(lampro.model, "LC2P");
  assert.equal(lampro.name, "P 2 indoor LED Display Module");
  assert.equal(lampro.unit, "Pcs");
});

test("uses the configured model for each power supply brand", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: {}, controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [],
      powerSupplies: [
        { id: "PS_LD200", model: "LD-200", label: "Power Supply: LD-200", price: 1600, brand: "Lampro", unit: "Pcs" },
        { id: "PS_LRS200", model: "LRS-200", label: "Power Supply: LRS-200", price: 1700, brand: "Mean well", unit: "Pcs" },
        { id: "PS_N200V5A", model: "N200V5-A", label: "Power Supply: N200V5-A", price: 1800, brand: "G-Energy", unit: "Pcs" },
      ],
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.equal(products.find((item) => item.brand === "Lampro").name, "Power Supply: LD-200");
  assert.equal(products.find((item) => item.brand === "Lampro").model, "LD-200");
  assert.equal(products.find((item) => item.brand === "Lampro").unit, "Pcs");
  assert.equal(products.find((item) => item.brand === "Mean well").model, "LRS-200");
  assert.equal(products.find((item) => item.brand === "G-Energy").model, "N200V5-A");
  assert.equal(products.find((item) => item.brand === "G-Energy").sourceKey, "led:power-supply:PS_N200V5A");
  assert.equal(products.find((item) => item.brand === "G-Energy").metadata.label, "Power Supply: N200V5-A");
});

test("keeps base cabinet models empty until an admin model is selected", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: {}, controllers: [], novastarControllers: [], receivingCards: {}, powerSupplies: [],
      cabinetOptions: [
        { id: "mild", materialCode: "mild_steel", materialLabel: "Mild Steel", sizeKey: "640x480", label: "640mm x 480mm", price: 1 },
        { id: "aluminium", materialCode: "aluminium", materialLabel: "Aluminium", sizeKey: "640x640", label: "640mm x 640mm", price: 1 },
        { id: "magnesium", materialCode: "magnesium", materialLabel: "Magnesium", sizeKey: "960x960", label: "960mm x 960mm", price: 1 },
      ],
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.deepEqual(products.map((item) => item.model), [null, null, null]);
  assert.deepEqual(products.map((item) => item.metadata.model), ["", "", ""]);
});

test("does not turn live admin cabinet models into static seed products", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: {}, controllers: [], novastarControllers: [], receivingCards: {}, powerSupplies: [],
      cabinetOptions: [
        { id: "base", catalogRole: "base", sourceCatalog: "admin", materialLabel: "Aluminium", sizeKey: "640x480", label: "640mm x 480mm", price: 1 },
        { id: "admin:1:cab-x", catalogRole: "model", sourceCatalog: "admin", materialLabel: "Aluminium", sizeKey: "640x480", label: "640mm x 480mm", model: "CAB-X", price: 2 },
      ],
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.deepEqual(products.filter((item) => item.componentType === "cabinet").map((item) => item.sourceKey), ["led:cabinet:base"]);
});

test("maps component models separately from Novastar internal ids", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: {}, controllers: [], cabinetOptions: [], powerSupplies: [],
      novastarControllers: [{ id: "NS_TU15PRO", model: "TU-15 Pro", label: "Controller: TU-15 Pro", price: 150000 }],
      receivingCards: { NS_NV3210: { model: "NV3210", label: "Receiving Card: NV3210", unitPrice: 4000 } },
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.equal(products.find((item) => item.sourceKey === "led:controller:NS_TU15PRO").model, "TU-15 Pro");
  assert.equal(products.find((item) => item.sourceKey === "led:receiving-card:NS_NV3210").model, "NV3210");
  assert.equal(products.find((item) => item.sourceKey === "led:controller:NS_TU15PRO").unit, "Pcs");
  assert.equal(products.find((item) => item.sourceKey === "led:receiving-card:NS_NV3210").unit, "Pcs");
});
