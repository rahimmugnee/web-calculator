import { defaultQuotationCatalog, getCabinetFootprintFt } from "./defaultQuotationCatalog";

test("cabinet catalog exposes indoor and outdoor material/size options", () => {
  const options = defaultQuotationCatalog.cabinetOptions;
  const baseOptions = options.filter((option) => option.catalogRole !== "model");
  const indoor = baseOptions.filter((option) => option.displayType === "indoor");
  const outdoor = baseOptions.filter((option) => option.displayType === "outdoor");

  expect(indoor.map((option) => option.sizeKey)).toEqual(["640x480", "640x640"]);
  expect(indoor.every((option) => option.materialCode === "aluminium")).toBe(true);
  expect(new Set(outdoor.map((option) => option.materialCode))).toEqual(
    new Set(["mild_steel", "magnesium", "aluminium"])
  );
  expect(outdoor.filter((option) => option.materialCode === "mild_steel").map((option) => option.variantCode)).toEqual([
    "open",
    "open",
    "open",
    "open",
    "backdoor",
    "backdoor",
    "backdoor",
    "backdoor",
  ]);
  expect(baseOptions.every((option) => option.price === 8000)).toBe(true);
  expect(baseOptions.every((option) => option.brand === "" && option.model === "")).toBe(true);
});

test("cabinet footprint uses selected option dimensions", () => {
  const footprint = getCabinetFootprintFt(
    defaultQuotationCatalog.physical,
    "cabinet_outdoor_magnesium_960x960",
    defaultQuotationCatalog.cabinetOptions
  );

  expect(footprint.w).toBeCloseTo(960 / 304.8);
  expect(footprint.h).toBeCloseTo(960 / 304.8);
});

test("LED modules store only one default price", () => {
  const modulePrices = Object.values(defaultQuotationCatalog.modelGroups).flatMap((locations) =>
    Object.values(locations).flatMap((models) => models.map((model) => model.prices))
  );
  const brandedPrices = Object.values(defaultQuotationCatalog.moduleBrandPrices).flatMap((models) => Object.values(models));

  expect([...modulePrices, ...brandedPrices].every((prices) =>
    Object.keys(prices).length === 1 && Number.isFinite(Number(prices.default))
  )).toBe(true);
});
