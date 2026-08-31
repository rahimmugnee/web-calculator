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
