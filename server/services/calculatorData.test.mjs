import assert from "node:assert/strict";
import test from "node:test";
import { buildCalculatorDataResponse } from "./calculatorData.mjs";

test("builds the public all-calculator data contract", () => {
  const products = [
    {
      source_key: "led:controller:C1",
      source_catalog: "static-js",
      system_type: "led-display",
      category_slug: "led-controller",
      component_type: "controller",
      name: "Controller C1",
      model: "C1",
      unit: "Pcs",
      technical_metadata: { id: "C1" },
      brand_name: "Huidu",
      price_tier: "default",
      unit_price: "12000.0000",
    },
    {
      source_key: "pa:CMX-AMP-1",
      source_catalog: "static-js",
      system_type: "pa-system",
      category_slug: "pa-system",
      component_type: "amplifier",
      name: "PA Amplifier",
      model: "AMP-1",
      unit: "Pcs",
      technical_metadata: { id: "CMX-AMP-1", installationType: "wired" },
      brand_name: "CMX",
      price_tier: "default",
      unit_price: "25000.0000",
    },
    {
      source_key: "conference:SPOON-CU-1",
      source_catalog: "static-js",
      system_type: "conference-system",
      category_slug: "conference-system",
      component_type: "control-unit",
      name: "Conference Control Unit",
      model: "CU-1",
      unit: "Pcs",
      technical_metadata: { id: "SPOON-CU-1", systemType: "wired" },
      brand_name: "Spoon",
      price_tier: "default",
      unit_price: "45000.0000",
    },
  ];

  const response = buildCalculatorDataResponse({
    products,
    calculatorSettings: [
      { calculator_type: "fixed-led", settings: { defaultDeliveryDays: 45 }, is_active: true },
      { calculator_type: "rental-led", settings: { sftRate: 175 }, is_active: true },
      { calculator_type: "disabled", settings: { ignored: true }, is_active: false },
    ],
    quotationSettings: { quotation_prefix: "MUG" },
    invoiceSettings: { invoice_prefix: "MUG-INV", settings: { paper: "a4" } },
    priceTiers: [{ id: 1, code: "gold", name: "Gold", is_active: true }],
  });

  assert.strictEqual(response.products, products);
  assert.deepEqual(response.calculatorSettings, {
    "fixed-led": { defaultDeliveryDays: 45 },
    "rental-led": { sftRate: 175 },
  });
  assert.deepEqual(response.quotationSettings, { quotation_prefix: "MUG" });
  assert.deepEqual(response.invoiceSettings, { invoice_prefix: "MUG-INV", settings: { paper: "a4" } });
  assert.deepEqual(response.priceTiers, [{ id: 1, code: "gold", name: "Gold", is_active: true }]);
});

test("returns a stable empty contract when optional database rows are absent", () => {
  assert.deepEqual(buildCalculatorDataResponse(), {
    products: [],
    calculatorSettings: {},
    quotationSettings: null,
    invoiceSettings: null,
    priceTiers: [],
  });
});
