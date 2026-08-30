import { defaultQuotationCatalog, getCabinetFootprintFt } from "./defaultQuotationCatalog";

test("cabinet catalog exposes indoor and outdoor material/size options", () => {
  const options = defaultQuotationCatalog.cabinetOptions;
  const indoor = options.filter((option) => option.displayType === "indoor");
  const outdoor = options.filter((option) => option.displayType === "outdoor");

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
  expect(options.every((option) => option.price === 8000)).toBe(true);
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
