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

  expect(payload.items.find((item) => item.name === "Power Supply")).toEqual(expect.objectContaining({
    brand: "Lampro",
    model: "LD-200",
  }));
});
