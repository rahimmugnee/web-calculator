import {
  fitPdfTextSize,
  fitRoundedCornerRadius,
  getCataloguePaths,
  normalizePdfText,
} from "./PDFButton";

const cabinetCataloguePath = "Mugnee Product data sheet/Cabinet 640 X 480.pdf";
const structureCataloguePath =
  "Mugnee Product data sheet/Recieving Card, PSu and structure/Structure.pdf";

function buildExportData(cabinet) {
  return {
    model: { id: "smd-in-p2", name: "P2" },
    items: {
      dispType: "indoor",
      technology: "smd",
      controllerId: "VP210H",
      receivingPicked: { id: "R712" },
      brands: {
        module: "Lampro",
        controller: "Huidu",
        psu: "Lampro",
      },
      cabinetEnabled: true,
      cabinet,
    },
  };
}

test("adds 640x480 cabinet catalogue for matching cabinet size", () => {
  const paths = getCataloguePaths(
    buildExportData({
      sizeId: "640x480",
      optionId: "cabinet_indoor_aluminium_640x480",
      sizeLabel: "640mm x 480mm",
    })
  );

  expect(paths).toContain(cabinetCataloguePath);
});

test("does not add 640x480 cabinet catalogue for other cabinet sizes", () => {
  const paths = getCataloguePaths(
    buildExportData({
      sizeId: "960x960",
      optionId: "cabinet_outdoor_aluminium_960x960",
      sizeLabel: "960mm x 960mm",
    })
  );

  expect(paths).not.toContain(cabinetCataloguePath);
});

test("adds the renamed structure catalogue", () => {
  const paths = getCataloguePaths(buildExportData({ sizeId: "960x960" }));

  expect(paths).toContain(structureCataloguePath);
  expect(paths).not.toContain("Mugnee Product data sheet/Recieving Card, PSu and structure/Frame.pdf");
});

test.each(["Absen", "Synoveta"])(
  "does not merge any catalogue when the %s module catalogue folder is unavailable",
  (moduleBrand) => {
    const exportData = buildExportData({ sizeId: "640x480" });
    exportData.items.brands.module = moduleBrand;

    expect(getCataloguePaths(exportData)).toEqual([]);
  }
);

test("does not merge another brand catalogue for a custom module brand", () => {
  const exportData = buildExportData({ sizeId: "640x480" });
  exportData.items.brands.module = "My Custom Brand";
  exportData.items.brandSelections = { module: "Custom" };

  expect(getCataloguePaths(exportData)).toEqual([]);
});

test("uses only the Renex catalogue folder for a Renex quotation", () => {
  const exportData = buildExportData({
    sizeId: "640x480",
    optionId: "cabinet_indoor_aluminium_640x480",
  });
  exportData.catalogueCompanyCode = "renex";

  const paths = getCataloguePaths(exportData);

  expect(paths.length).toBeGreaterThan(0);
  expect(paths.every((path) => path.startsWith("Renex Product data sheet/"))).toBe(true);
  expect(paths).toContain("Renex Product data sheet/Cabinet 640 X 480.pdf");
  expect(paths).toContain("Renex Product data sheet/Recieving Card, PSu and structure/Frame.pdf");
  expect(paths.some((path) => path.startsWith("Mugnee Product data sheet/"))).toBe(false);
});

test.each([
  ["indoor", "smd", "Renex Product data sheet/Module Catalogue/Indoor/Leyard/LUS Series Brochure-INDOOR MODULE SMD&GOB.pdf"],
  ["indoor", "cob", "Renex Product data sheet/Module Catalogue/Indoor/Leyard/Leyard SV COB 20250812.pdf"],
  ["outdoor", "smd", "Renex Product data sheet/Module Catalogue/Outdoor/Leyard/LVS Series - Outdoor Leyard.pdf"],
])("uses the Renex Leyard brochure for %s %s", (displayType, technology, expectedPath) => {
  const exportData = buildExportData({ sizeId: "960x960" });
  exportData.catalogueCompanyCode = "Renex";
  exportData.items.dispType = displayType;
  exportData.items.technology = technology;
  exportData.items.brands.module = "Leyard";

  expect(getCataloguePaths(exportData)).toContain(expectedPath);
});

test.each(["Mean well", "Mean Well", "Mean-Well", "mean_well"])(
  "adds the Mean Well power-supply catalogue for brand label %s",
  (psuBrand) => {
    const exportData = buildExportData({ sizeId: "960x960" });
    exportData.items.brands.psu = psuBrand;

    expect(getCataloguePaths(exportData)).toContain(
      "Mugnee Product data sheet/Recieving Card, PSu and structure/Mean_Well_LRS-200_5V_200W_Power_Supply.pdf"
    );
  }
);

test.each([
  ["NS_VX400", "VX400-pro.pdf"],
  ["NS_VX600", "VX600-Pro-All-in-One-Controller-Specifications-V1.0.0.pdf"],
  ["NS_VX1000", "VX1000_Pro_All-in-One_Controller_Technical_Specification.pdf"],
  ["NS_VX2000", "VX2000 Pro Specification.pdf"],
])("uses the renamed Mugnee VX catalogue for %s", (controllerId, filename) => {
  const exportData = buildExportData({ sizeId: "960x960" });
  exportData.items.controllerId = controllerId;
  exportData.items.brands.controller = "Novastar";

  expect(getCataloguePaths(exportData)).toContain(
    `Mugnee Product data sheet/Processor and Controller/Novastar/${filename}`
  );
});

test("uses the renamed Renex VX1000 catalogue", () => {
  const exportData = buildExportData({ sizeId: "960x960" });
  exportData.catalogueCompanyCode = "renex";
  exportData.items.controllerId = "NS_VX1000";
  exportData.items.brands.controller = "Novastar";

  expect(getCataloguePaths(exportData)).toContain(
    "Renex Product data sheet/Processor and Controller/Novastar/VX1000 Pro.pdf"
  );
});

test("normalizes quotation text for the editable native PDF layer", () => {
  expect(normalizePdfText("Grand Total ৳1,500 — Size 8 × 4 ft"))
    .toBe("Grand Total ৳1,500 - Size 8 x 4 ft");
  expect(normalizePdfText("Name: আব্দুর রহিম, পদবি: উপ সহকারী প্রকৌশলী"))
    .toBe("Name: আব্দুর রহিম, পদবি: উপ সহকারী প্রকৌশলী");
});

test("shrinks native PDF text that is wider than its table cell", () => {
  expect(fitPdfTextSize(10, 72, 60)).toBeCloseTo(8.333, 3);
  expect(fitPdfTextSize(10, 58, 60)).toBe(10);
});

test("scales a very large rounded corner into a capsule instead of an ellipse", () => {
  expect(fitRoundedCornerRadius(170, 44, 999, 999)).toEqual({ x: 22, y: 22 });
  expect(fitRoundedCornerRadius(170, 44, 10, 10)).toEqual({ x: 10, y: 10 });
});
