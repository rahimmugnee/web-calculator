import test from "node:test";
import assert from "node:assert/strict";
import { mapStaticCatalog } from "./catalog-mapper.mjs";

test("maps one LED module base price and keeps non-module defaults", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: { smd: { indoor: [{ id: "p2", name: "P2", prices: { gold: 10, diamond: 20 } }] } },
      moduleBrandPrices: {}, controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [],
      psuModelLabel: "PSU", powerSupplyBrands: [], powerSupplyPrice: 5,
    },
    paProducts: [{ id: "amp", componentType: "amplifier", productName: "Amp", unitPrice: 100 }],
    conferenceProducts: [],
  });
  assert.deepEqual(products.find((item) => item.sourceKey === "led:module:lampro:p2").prices, { default: 10 });
  assert.equal(products.find((item) => item.sourceKey === "pa:amp").prices.default, 100);
  assert.equal(new Set(products.map((item) => item.sourceKey)).size, products.length);
});

test("preserves category-specific fields in metadata", () => {
  const products = mapStaticCatalog({ ledCatalog: { modelGroups: {}, controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplyPrice: 0 }, paProducts: [{ id: "x", productName: "X", componentType: "speaker", impedanceOhms: 8, unitPrice: 1 }], conferenceProducts: [] });
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
      controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplyPrice: 0,
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
      controllers: [], novastarControllers: [], receivingCards: {}, cabinetOptions: [], powerSupplyPrice: 0,
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
      powerSupplyPrice: 1600,
      powerSupplyPrices: { Lampro: 1600, "Mean well": 1700, "G-Energy": 1800 },
      powerSupplyBrands: ["Lampro", "Mean well", "G-Energy"],
      powerSupplyModels: { Lampro: "LD-200", "Mean well": "LRS-200", "G-Energy": "N200V5-A" },
    },
    paProducts: [], conferenceProducts: [],
  });

  assert.equal(products.find((item) => item.brand === "Lampro").name, "Power Supply: LD-200");
  assert.equal(products.find((item) => item.brand === "Lampro").model, "LD-200");
  assert.equal(products.find((item) => item.brand === "Lampro").unit, "Pcs");
  assert.equal(products.find((item) => item.brand === "Mean well").model, "LRS-200");
  assert.equal(products.find((item) => item.brand === "G-Energy").model, "N200V5-A");
});

test("maps component models separately from Novastar internal ids", () => {
  const products = mapStaticCatalog({
    ledCatalog: {
      modelGroups: {}, controllers: [], cabinetOptions: [], powerSupplyBrands: [], powerSupplyPrice: 0,
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
