import { render, screen, within } from "@testing-library/react";
import Invoice from "./Invoice";
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
    brands: { module: "Lampro" }, cabinetEnabled: true, cabinet: { brand: "Cabinet Brand", model: "640x480" },
    customItems: [{ name: "Spare Cable", qty: 3, unit: "Meter", price: 10 }],
  },
  transport: { enabled: true }, discountEnabled: true,
};
const calc = { unitPrices: { unitCtrl: 100, transport: 20 }, totals: {
  ledSetUnitTotal: 1000, controllerTotal: 100, accessoriesUnit: 50, accessories: 100,
  installationUnit: 25, installation: 50, transport: 20,
  vatEnabled: true, totalBeforeVat: 2300, vatAmount: 230, grandTotal: 2530, discount: 30, payable: 2500,
} };

test("all company irregular tables match Mugnee with package details, quantities and totals", () => {
  let mugneeTable;
  for (const code of ["mugnee", "renex", "sasha"]) {
    useCatalog.mockReturnValue({ catalog: { controllers: [] }, company: { code }, invoiceSettings: {} });
    const view = render(<Invoice snapshot={snapshot} calc={calc} quotationRef="TEST" />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("columnheader").map(cell => cell.textContent))
      .toEqual(["SL.", "Item Name", "Brand", "Model", "Unit", "Qty", "Unit Price \u09f3", "Total Price \u09f3"]);
    const packageRow = within(table).getByText("LED Display Module").closest("tr");
    expect(packageRow).toHaveTextContent("LD-200");
    expect(packageRow).toHaveTextContent("NV3210");
    expect(packageRow).toHaveTextContent("640x480");
    expect(within(packageRow).getAllByRole("cell")[4]).toHaveTextContent("Set");
    expect(within(packageRow).getAllByRole("cell")[5]).toHaveTextContent("2");
    expect(within(table).getByText("Controller: TU-20 Pro").closest("tr")).toHaveTextContent("100");
    expect(table).toHaveTextContent("Spare Cable");
    expect(table).toHaveTextContent("Transport Cost");
    expect(table).toHaveTextContent("Subtotal =");
    expect(table).toHaveTextContent("Payable =");
    if (code === "mugnee") mugneeTable = table.outerHTML;
    else expect(table.outerHTML).toBe(mugneeTable);
    view.unmount();
  }
});
