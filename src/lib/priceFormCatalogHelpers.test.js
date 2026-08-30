import { getCabinetRcPsuPerCabinet } from "./priceFormCatalogHelpers";

test.each([
  ["P1.25", "640x480", { rc: 2, psu: 2 }],
  ["P1.53", "640x480", { rc: 2, psu: 2 }],
  ["P1.86", "640x480", { rc: 1, psu: 1 }],
  ["P1.25", "640x640", { rc: 2, psu: 2 }],
  ["P1.53", "640x640", { rc: 2, psu: 2 }],
  ["P1.86", "640x640", { rc: 1, psu: 2 }],
  ["P2.5", "960x960", { rc: 2, psu: 3 }],
  ["P3", "960x960", { rc: 2, psu: 3 }],
  ["P3.076", "960x960", { rc: 2, psu: 3 }],
  ["P3.91", "960x960", { rc: 1, psu: 3 }],
  ["P4", "1240x960", { rc: 2, psu: 4 }],
  ["P5", "1240x960", { rc: 1, psu: 4 }],
  ["P2.5", "1280x1280", { rc: 2, psu: 4 }],
  ["P6", "1280x1280", { rc: 1, psu: 4 }],
])("returns cabinet RC/PSU rule for %s on %s", (modelName, sizeKey, expected) => {
  expect(getCabinetRcPsuPerCabinet(modelName, { sizeKey })).toEqual(expected);
});
