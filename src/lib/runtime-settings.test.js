import { normalizeRuntimeSettings } from "./runtime-settings.js";

test("returns stable calculator, quotation, and invoice fallbacks", () => {
  const settings = normalizeRuntimeSettings();

  expect(settings.calculators["fixed-led"]).toEqual({});
  expect(settings.calculators["pa-system"]).toEqual({});
  expect(settings.calculators["conference-system"]).toEqual({});
  expect(settings.calculators["rental-led"]).toEqual({
    sftRate: 150,
    structureRate: 3000,
    soundRate: 0,
    transportValue: 0,
    duration: 1,
    vatEnabled: false,
    includedQty: {
      mixer: 1,
      processor: 1,
      wirelessMic: 1,
      wiredMic: 1,
      laptop: 1,
      technicalPerson: 1,
    },
  });
  expect(settings.quotation).toEqual({});
  expect(settings.invoice).toEqual({});
});

test("normalizes admin-style calculator rows and keeps unknown settings", () => {
  const settings = normalizeRuntimeSettings({
    calculators: [
      {
        calculator_type: "rental-led",
        settings: {
          sftRate: "225",
          duration: "2.2",
          customRentalField: "keep me",
          includedQty: { mixer: "3.1", customIncludedItem: 7 },
        },
      },
      { calculator_type: "future-calculator", settings: { experimental: true } },
      { calculator_type: "disabled-calculator", settings: { hidden: false }, is_active: false },
    ],
  });

  expect(settings.calculators["rental-led"]).toMatchObject({
    sftRate: 225,
    duration: 3,
    customRentalField: "keep me",
    includedQty: { mixer: 4, customIncludedItem: 7 },
  });
  expect(settings.calculators["future-calculator"]).toEqual({ experimental: true });
  expect(settings.calculators).not.toHaveProperty("disabled-calculator");
});

test("accepts repository-style maps and unwraps settings rows", () => {
  const settings = normalizeRuntimeSettings({
    calculators: {
      "fixed-led": { technology: "cob", custom: 42 },
      "pa-system": { settings: { preferredBrand: "CMX" }, is_active: true },
    },
  });

  expect(settings.calculators["fixed-led"]).toEqual({ technology: "cob", custom: 42 });
  expect(settings.calculators["pa-system"]).toEqual({ preferredBrand: "CMX" });
});

test("preserves unknown root and template keys while replacing malformed objects", () => {
  const settings = normalizeRuntimeSettings({
    version: "v7",
    extra: { retained: true },
    quotation: { quotation_prefix: "MQ", customHeader: { title: "Proposal" } },
    invoice: { template_key: "mugnee-default", customLayout: true },
  });

  expect(settings.version).toBe("v7");
  expect(settings.extra).toEqual({ retained: true });
  expect(settings.quotation).toEqual({ quotation_prefix: "MQ", customHeader: { title: "Proposal" } });
  expect(settings.invoice).toEqual({ template_key: "mugnee-default", customLayout: true });
  expect(normalizeRuntimeSettings({ quotation: [], invoice: "invalid" })).toMatchObject({ quotation: {}, invoice: {} });
});

test("uses safe rental defaults for invalid values without dropping other fields", () => {
  const rental = normalizeRuntimeSettings({
    calculators: {
      "rental-led": {
        sftRate: -1,
        structureRate: "",
        soundRate: "invalid",
        transportValue: null,
        duration: 0,
        vatEnabled: "yes",
        includedQty: { mixer: 0, processor: -3, note: "retained" },
      },
    },
  }).calculators["rental-led"];

  expect(rental).toMatchObject({
    sftRate: 150,
    structureRate: 3000,
    soundRate: 0,
    transportValue: 0,
    duration: 1,
    vatEnabled: false,
    includedQty: { mixer: 1, processor: 1, note: "retained" },
  });
});

