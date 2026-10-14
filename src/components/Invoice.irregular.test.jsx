import { render, screen, within } from "@testing-library/react";
import Invoice from "./Invoice";
import { calcAll, toBDT } from "../lib/calc";
import { useCatalog } from "../context/CatalogContext.jsx";

jest.mock("../context/CatalogContext.jsx", () => ({ useCatalog: jest.fn() }));

const snapshot = {
  quotationMode: "irregular", irregular: { unit: "Set", qty: 2 },
  model: { name: "P1.25 Indoor", code: "LC1.25P", itemName: "LED Display Module" },
  customer: {}, display: { widthFt: 10.5, heightFt: 5.78, sft: 60.69 },
  items: {
    technology: "smd", controllerId: "TU20", controllerQty: 1,
    controllerPicked: { itemName: "Controller: TU-20 Pro", model: "TU-20 Pro", brand: "Novastar" },
    receivingPicked: { itemName: "Receiving Card: NV3210", model: "NV3210", brand: "Novastar" },
    psuPicked: { model: "LD-200", brand: "Lampro" },
    brands: { module: "Lampro" }, cabinetEnabled: true, cabinet: { itemName: "Aluminium 640mm x 480mm", brand: "Cabinet Brand", model: "640x480" },
    customItems: [{ name: "Spare Cable", qty: 3, unit: "Meter", price: 10 }],
  },
  transport: { enabled: true }, discountEnabled: true,
};
const calc = { unitPrices: { unitCtrl: 100, transport: 20 }, totals: {
  ledSetUnitTotal: 1000, controllerTotal: 100, accessoriesUnit: 50, accessories: 100,
  installationUnit: 25, installation: 50, transport: 20,
  vatEnabled: true, totalBeforeVat: 2300, vatAmount: 230, grandTotal: 2530, discount: 30, payable: 2500,
} };

test("Mugnee irregular table preserves package details, quantities and totals", () => {
  for (const code of ["mugnee"]) {
    useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code }, invoiceSettings: {} });
    const view = render(<Invoice snapshot={snapshot} calc={calc} quotationRef="TEST" />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent))
      .toEqual(["SL.", "Item Name", "Brand", "Model", "Unit", "Qty", "Unit Price \u09f3", "Total Price \u09f3"]);
    const packageRow = within(table).getByText("LED Display Module").closest("tr");
    expect(packageRow).toHaveTextContent("LD-200");
    expect(packageRow).toHaveTextContent("NV3210");
    expect(packageRow).toHaveTextContent("640x480");
    expect(packageRow).toHaveTextContent("Aluminium Cabinet 640mm x 480mm");
    expect(within(packageRow).getAllByRole("cell")[4]).toHaveTextContent("Set");
    expect(within(packageRow).getAllByRole("cell")[5]).toHaveTextContent("2");
    expect(within(table).getByText("Controller: TU-20 Pro").closest("tr")).toHaveTextContent("100");
    expect(table).toHaveTextContent("Spare Cable");
    expect(table).toHaveTextContent("Transport Cost");
    expect(table).toHaveTextContent("Subtotal =");
    expect(table).toHaveTextContent("Payable =");
    view.unmount();
  }
});


test.each([
  ["irregular", 2, "2 set", "121.38"],
  ["irregular", 1, "1 set", "60.69"],
  ["regular", 2, "", "60.69"],
])("Mugnee %s title uses quantity %s and the corresponding area", (quotationMode, qty, setLabel, area) => {
  useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code: "mugnee" }, invoiceSettings: {} });
  const { container } = render(<Invoice snapshot={{ ...snapshot, quotationMode, irregular: { unit: "Set", qty } }} calc={calc} quotationRef="TEST" />);
  const title = container.querySelector(".price-title");
  expect(title).toHaveTextContent(`LED Display. ${setLabel ? setLabel + " " : ""}(10.5ft \u00d7 5.78ft) | Sft: (${area})`);
  if (quotationMode === "regular") expect(title).not.toHaveTextContent("set");
});


test.each(["renex", "sasha"])("%s irregular quotation retains its own company layout", (code) => {
  useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code }, invoiceSettings: {} });
  const { container } = render(<Invoice snapshot={snapshot} calc={calc} quotationRef="TEST" />);
  expect(container.querySelector(".mugnee-invoice-table")).toBeNull();
  expect(container.querySelector(code === "renex" ? ".renex-line-items" : ".sasha-invoice-table")).toBeInTheDocument();
});


test.each(["regular", "irregular"])("Renex %s uses separate rows with set-scaled quantities and prices", (quotationMode) => {
  useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code: "renex" }, invoiceSettings: {} });
  const count = quotationMode === "irregular" ? 2 : 1;
  const data = { ...snapshot, quotationMode, transport: { enabled: false }, discountEnabled: false,
    items: { ...snapshot.items, modulesQty: 110, rcQty: 37, psQty: 28, controllerQty: 3, cabinetEnabled: false, customItems: [] } };
  const result = calcAll({ companyCode: "renex", quotationMode, irregularQty: 2, modulesQty: 110, rcQty: 37, psQty: 28,
    controllerQty: 3, unitModule: 10, unitRC: 20, unitPS: 30, controllerPrice: 100,
    accessoriesMode: "manual", accessoriesValue: 50, installMode: "manual", installValue: 25 });
  const { container } = render(<Invoice snapshot={data} calc={result} quotationRef="TEST" />);
  const rows = container.querySelectorAll(".renex-line-item");
  expect(rows).toHaveLength(6);
  const quantities = [110 * count, 3, 37 * count, 28 * count, count, count];
  const units = ["Pcs", "Pcs", "Pcs", "Pcs", "Lot", "Make"];
  const prices = [1100 * count, 300, 740 * count, 840 * count, 50 * count, 25 * count];
  rows.forEach((row, index) => {
    expect(row.querySelector("small")).toHaveTextContent(quantities[index] + " " + units[index]);
    expect(row.querySelector(".renex-item-total")).toHaveTextContent(toBDT(prices[index]));
  });
  expect(result.totals.grandTotal).toBe(prices.reduce((sum, price) => sum + price, 0));
  const title = container.querySelector(".renex-proposal-title");
  expect(title).toHaveTextContent("Sft: (60.69)");
  if (quotationMode === "irregular") expect(title).toHaveTextContent("Sft: (60.69) | Display: 2 set");
  else expect(title).not.toHaveTextContent("Display:");
});


test("Sasha irregular mode shows total area and the same component details as regular", () => {
  useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code: "sasha" }, invoiceSettings: {} });
  let regularDetails;
  for (const quotationMode of ["regular", "irregular"]) {
    const count = quotationMode === "irregular" ? 2 : 1;
    const data = { ...snapshot, quotationMode,
      items: { ...snapshot.items, modulesQty: 110, rcQty: 37, psQty: 28 } };
    const result = calcAll({ companyCode: "sasha", quotationMode, irregularQty: 2, modulesQty: 110,
      rcQty: 37, psQty: 28, controllerQty: 1, controllerPrice: 100,
      unitModule: 10, unitRC: 20, unitPS: 30 });
    const view = render(<Invoice snapshot={data} calc={result} quotationRef="TEST" />);
    const row = view.container.querySelector(".sasha-system-row");
    const cells = within(row).getAllByRole("cell");
    expect(cells[1]).toHaveTextContent("Module Brand: Lampro | Model: LC1.25P");
    expect(cells[1]).toHaveTextContent("Controller Brand: Novastar | Model: TU-20 Pro");
    expect(cells[1]).toHaveTextContent("Receiving Card Brand: Novastar | Model: NV3210");
    expect(cells[1]).toHaveTextContent("Power Supply Brand: Lampro | Model: LD-200");
    expect(cells[1]).toHaveTextContent("Aluminium Cabinet 640mm x 480mm | Brand: Cabinet Brand | Model: 640x480");
    expect(cells[2]).toHaveTextContent("Sqft");
    const area = count === 2 ? 121.38 : 60.69;
    expect(cells[3].textContent).toBe(String(area));
    const displayTotal = (1100 + 740 + 840) * count + 100;
    expect(cells[4]).toHaveTextContent(toBDT(Math.round(displayTotal / area)));
    expect(cells[5]).toHaveTextContent(toBDT(displayTotal));
    const details = Array.from(cells[1].querySelectorAll("span")).map(span => span.textContent);
    if (quotationMode === "regular") {
      regularDetails = details;
      expect(cells[1].querySelector("strong")).not.toHaveTextContent("set");
    } else {
      expect(details).toEqual(regularDetails);
      expect(cells[1].querySelector("strong")).toHaveTextContent("LED Display | 2 set");
    }
    expect(view.container.querySelector(".sasha-proposal-title")).not.toHaveTextContent("(SMD)");
    view.unmount();
  }
});
