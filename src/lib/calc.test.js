import { buildQuotationFilenameTitle, buildQuotationTitle, calcAll, generateRef, quotationTitlePdfFilename } from "./calc";

test("generates company-specific yearly quotation references", () => {
  const date = new Date("2026-08-29T00:00:00Z");
  expect(generateRef("mugnee", 1, date)).toBe("MUG-2026-0001");
  expect(generateRef("renex", 1, date)).toBe("REN-2026-0001");
  expect(generateRef("sasha", 1, date)).toBe("SAS-2026-0001");
  expect(generateRef("mugnee", 7, date, "LIVE-Q")).toBe("LIVE-Q-2026-0007");
});

test("adds enabled custom item price to totals", () => {
  const result = calcAll({
    modulesQty: 2,
    unitModule: 1000,
    customItemEnabled: true,
    customItemPrice: 2500,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  expect(result.totals.totalModules).toBe(2000);
  expect(result.totals.totalCustomItem).toBe(2500);
  expect(result.unitPrices.customItem).toBe(2500);
  expect(result.totals.grandTotal).toBe(4500);
});

test("ignores custom item price when disabled", () => {
  const result = calcAll({
    modulesQty: 2,
    unitModule: 1000,
    customItemEnabled: false,
    customItemPrice: 2500,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  expect(result.totals.totalCustomItem).toBe(0);
  expect(result.totals.grandTotal).toBe(2000);
});

test.each([
  ["mugnee", 1000, 2000],
  ["renex", 1100, 2200],
  ["sasha", 1130, 2260],
])("applies the %s multiplier to accessories and installation costs", (companyCode, expectedAccessories, expectedInstallation) => {
  const result = calcAll({
    companyCode,
    accessoriesMode: "manual",
    accessoriesValue: 1000,
    installMode: "manual",
    installValue: 2000,
  });

  expect(result.totals.accessories).toBe(expectedAccessories);
  expect(result.totals.installation).toBe(expectedInstallation);
});

test("generates compact quotation PDF filename from proposal title", () => {
  const snapshot = {
    model: { name: "P1.25 Indoor" },
    display: { widthFt: "5.25", heightFt: "3.15", sft: "16.54" },
    items: { technology: "smd" },
  };

  expect(buildQuotationTitle(snapshot)).toBe(
    "Proposal for P1.25 Indoor (SMD) LED Display. (5.25ft x 3.15ft) Sft 16.54"
  );
  expect(buildQuotationFilenameTitle(snapshot)).toBe(
    "Proposal for P1.25 Indoor (SMD) LED Display. (5.25ft x 3.15ft)"
  );
  expect(quotationTitlePdfFilename(snapshot, "HO/MQ-260603-9580")).toBe(
    "Proposal_for_P1.25_Indoor_(SMD)_LED_Display._(5.25ft_x_3.15ft).pdf"
  );
});
