import { quotationHistoryPayload } from "./quotationHistory";

test("stores the complete pre-VAT total with VAT and grand total", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-0528",
    snapshot: { quotationType: "fixed", customer: {}, model: {}, display: {}, items: {} },
    calc: {
      totals: {
        subTotal: 594959,
        totalBeforeVat: 625523,
        vatAmount: 62553,
        grandTotal: 688076,
        payable: 688076,
      },
      unitPrices: {},
    },
  });

  expect(payload).toEqual(expect.objectContaining({
    subtotal: 625523,
    vat_amount: 62553,
    grand_total: 688076,
  }));
});

test("stores a power supply model when the picked PSU uses the model field", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-PSU",
    snapshot: {
      quotationType: "fixed",
      customer: {}, model: {}, display: {},
      items: { brands: { psu: "Lampro" }, psuPicked: { model: "LD-200" }, psQty: 1 },
    },
    calc: { totals: {}, unitPrices: {} },
  });

  expect(payload.items.find((item) => item.name === "Power Supply: LD-200")).toEqual(expect.objectContaining({
    brand: "Lampro",
    model: "LD-200",
  }));
});

test("stores the database LED module label as the item name", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-MODULE-LABEL",
    snapshot: {
      quotationType: "fixed",
      customer: {},
      model: { itemName: "P 2.5 SMD indoor LED Display Module", code: "LC2.5P" },
      display: {},
      items: { modulesQty: 10, brands: { module: "Lampro" } },
    },
    calc: { totals: {}, unitPrices: {} },
  });

  expect(payload.items[0]).toEqual(expect.objectContaining({
    name: "P 2.5 indoor LED Display Module",
    model: "LC2.5P",
  }));
});

test("stores database fields for controller, receiving card and power supply", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-DATABASE-FIELDS",
    snapshot: {
      quotationType: "fixed",
      customer: {},
      model: {},
      display: {},
      items: {
        controllerQty: 1,
        controllerPicked: { itemName: "DB Controller", brand: "DB Control", model: "CTRL-X", unit: "Set" },
        rcQty: 1,
        receivingPicked: { itemName: "DB Receiver", brand: "DB Receive", model: "RC-X", unit: "Card" },
        psQty: 1,
        psuPicked: { itemName: "DB PSU", brand: "DB Power", model: "PS-X", unit: "Unit" },
      },
    },
    calc: { totals: {}, unitPrices: {} },
  });

  expect(payload.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "DB Controller", brand: "DB Control", model: "CTRL-X", unit: "Pcs" }),
    expect.objectContaining({ name: "DB Receiver", brand: "DB Receive", model: "RC-X", unit: "Pcs" }),
    expect.objectContaining({ name: "Power Supply: DB PSU", brand: "DB Power", model: "PS-X", unit: "Pcs" }),
  ]));
});

test("stores readable Novastar models instead of internal ids", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-NOVASTAR",
    snapshot: {
      quotationType: "fixed",
      customer: {}, model: {}, display: {},
      items: {
        controllerId: "NS_TU15PRO",
        controllerLabel: "Controller: TU-15 Pro",
        controllerQty: 1,
        controllerPicked: { id: "NS_TU15PRO", model: "NS_TU15PRO" },
        rcQty: 1,
        receivingPicked: { id: "NS_NV3210", model: "NS_NV3210", label: "Receiving Card: NV3210" },
      },
    },
    calc: { totals: {}, unitPrices: {} },
  });

  expect(payload.items).toEqual(expect.arrayContaining([
    expect.objectContaining({ name: "Controller: TU-15 Pro", model: "TU-15 Pro" }),
    expect.objectContaining({ name: "Receiving Card: NV3210", model: "NV3210" }),
  ]));
});

test("uses N/A for an unselected cabinet brand and model", () => {
  const payload = quotationHistoryPayload({
    company: { id: 1 },
    quotationRef: "MUG-2026-CABINET-NONE",
    snapshot: {
      quotationType: "fixed",
      customer: {}, model: {}, display: {},
      items: {
        cabinetEnabled: true,
        cabinetQty: 1,
        cabinet: { itemName: "Aluminium Cabinet", invoiceLabel: "Aluminium Cabinet", brand: "", model: "" },
      },
    },
    calc: { totals: {}, unitPrices: {} },
  });

  expect(payload.items.find((item) => item.name === "Aluminium Cabinet")).toEqual(expect.objectContaining({
    brand: "N/A",
    model: "N/A",
  }));
});
