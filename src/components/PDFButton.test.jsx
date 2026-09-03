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

test("normalizes quotation text for the editable native PDF layer", () => {
  expect(normalizePdfText("Grand Total ৳1,500 — Size 8 × 4 ft"))
    .toBe("Grand Total ৳1,500 - Size 8 x 4 ft");
});

test("shrinks native PDF text that is wider than its table cell", () => {
  expect(fitPdfTextSize(10, 72, 60)).toBeCloseTo(8.333, 3);
  expect(fitPdfTextSize(10, 58, 60)).toBe(10);
});

test("scales a very large rounded corner into a capsule instead of an ellipse", () => {
  expect(fitRoundedCornerRadius(170, 44, 999, 999)).toEqual({ x: 22, y: 22 });
  expect(fitRoundedCornerRadius(170, 44, 10, 10)).toEqual({ x: 10, y: 10 });
});
