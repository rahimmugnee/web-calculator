import { render, screen, within } from "@testing-library/react";
import Invoice from "./Invoice";
import { CatalogProvider } from "../context/CatalogContext";
import { calcAll } from "../lib/calc";

function buildSnapshot(customItem) {
  return {
    model: { id: "p1", name: "P1 Indoor" },
    customer: { name: "", company: "", address: "", mobile: "", position: "" },
    display: { widthFt: "1", heightFt: "1", sft: "1" },
    tier: { id: "gold", label: "Gold" },
    items: {
      modulesQty: 1,
      rcQty: 0,
      psQty: 0,
      controllerQty: 0,
      controllerId: "",
      receivingPicked: null,
      brands: {},
      customItem,
      technology: "smd",
      dispType: "indoor",
    },
  };
}

test("renders enabled custom item as a pcs row", () => {
  const customItem = { enabled: true, name: "Spare Module", price: 2500 };
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 1000,
    customItemEnabled: customItem.enabled,
    customItemPrice: customItem.price,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice
        calc={calc}
        snapshot={buildSnapshot(customItem)}
        quotationRef="TEST-001"
        orderDate={new Date("2026-06-02T00:00:00")}
      />
    </CatalogProvider>
  );

  const row = screen.getByText("Spare Module").closest("tr");
  expect(row).toBeInTheDocument();
  expect(within(row).getByText("Pcs")).toBeInTheDocument();
  expect(within(row).getByText("1")).toBeInTheDocument();
});

test("shows Structure & Accessories with a Lot unit when no size is entered", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.display = { widthFt: "", heightFt: "", sft: "" };
  const calc = calcAll({
    modulesQty: 0,
    unitModule: 9300,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-NO-SIZE" />
    </CatalogProvider>
  );

  const row = screen.getByText("Structure & Accessories").closest("tr");
  expect(row).toBeInTheDocument();
  expect(within(row).getByText("Lot")).toBeInTheDocument();
});

test("renders multiple custom items as separate quotation rows", () => {
  const snapshot = buildSnapshot({ enabled: true, name: "Spare Module", price: 2500 });
  snapshot.items.customItems = [
    { name: "Spare Module", price: 2500 },
    { name: "Signal Cable", price: 1500 },
  ];
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 1000,
    customItemEnabled: true,
    customItems: snapshot.items.customItems,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-MULTI-CUSTOM" />
    </CatalogProvider>
  );

  expect(screen.getByText("Spare Module")).toBeInTheDocument();
  expect(screen.getByText("Signal Cable")).toBeInTheDocument();
  expect(calc.totals.totalCustomItem).toBe(4000);
});

test("renders COB P1.25 with the regular module, receiving card and power supply rows", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.model = { id: "cob-in-p1_25", name: "P1.25 Indoor" };
  snapshot.display.sft = "12";
  snapshot.items = {
    ...snapshot.items,
    cobP125SftPricing: true,
    modulesQty: 12,
    rcQty: 4,
    psQty: 6,
    receivingPicked: { label: "Receiving Card: NV3210" },
    technology: "cob",
  };

  const calc = calcAll({
    modulesQty: 12,
    unitModule: 12500,
    rcQty: 0,
    psQty: 0,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-COB-125" />
    </CatalogProvider>
  );

  const displayRow = screen.getByText("LED Display Module").closest("tr");
  expect(within(displayRow).getByText("P1.25 Indoor")).toBeInTheDocument();
  expect(within(displayRow).getByText("Pcs")).toBeInTheDocument();
  expect(within(displayRow).getByText("12")).toBeInTheDocument();
  expect(screen.getByText("NV3210")).toBeInTheDocument();
  expect(screen.getByText("Power Supply")).toBeInTheDocument();
});

test("renders Mugnee item, brand and model in separate table columns", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.model = { id: "smd-in-p1_25", name: "P1.25 Indoor", code: "LC1.25P", itemName: "P 1.25 SMD indoor LED Display Module" };
  snapshot.items.brands = { module: "Lampro" };
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 9300,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-COLUMNS" />
    </CatalogProvider>
  );

  const table = screen.getByRole("table");
  expect(within(table).getByRole("columnheader", { name: "Brand" })).toBeInTheDocument();
  expect(within(table).getByRole("columnheader", { name: "Model" })).toBeInTheDocument();
  const moduleRow = within(table).getByText("P 1.25 indoor LED Display Module").closest("tr");
  const cells = within(moduleRow).getAllByRole("cell");
  expect(cells[1]).toHaveTextContent("P 1.25 indoor LED Display Module");
  expect(cells[1]).not.toHaveTextContent("LC1.25P");
  expect(cells[2]).toHaveTextContent("Lampro");
  expect(cells[3]).toHaveTextContent("LC1.25P");
  expect(screen.getByText(/Proposal for P1\.25 Indoor/)).toBeInTheDocument();
  expect(screen.queryByText(/Proposal for LC1\.25P/)).not.toBeInTheDocument();
});

test("never renders Novastar internal ids in the model column", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.items = {
    ...snapshot.items,
    controllerId: "NS_TU15PRO",
    controllerQty: 1,
    controllerLabel: "Controller: TU-15 Pro",
    controllerPicked: { id: "NS_TU15PRO", model: "NS_TU15PRO", brand: "Novastar" },
    rcQty: 1,
    receivingPicked: { id: "NS_NV3210", model: "NS_NV3210", label: "Receiving Card: NV3210", brand: "Novastar" },
  };
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 100,
    controllerQty: 1,
    controllerPrice: 150000,
    rcQty: 1,
    unitRC: 4000,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-NOVASTAR-MODELS" />
    </CatalogProvider>
  );

  expect(screen.getByText("TU-15 Pro")).toBeInTheDocument();
  expect(screen.getByText("NV3210")).toBeInTheDocument();
  expect(screen.queryByText("NS_TU15PRO")).not.toBeInTheDocument();
  expect(screen.queryByText("NS_NV3210")).not.toBeInTheDocument();
});

test("renders database item name, brand and model with Pcs units", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.model = {
    id: "smd-in-p1_25",
    name: "P1.25 Indoor",
    code: "MODULE-DB",
    itemName: "Database Module",
    invoiceBrand: "Module Brand DB",
    invoiceUnit: "Panel",
  };
  snapshot.items = {
    ...snapshot.items,
    modulesQty: 1,
    controllerId: "CTRL",
    controllerQty: 1,
    controllerPicked: { itemName: "Database Controller", brand: "Controller Brand DB", model: "CTRL-DB", unit: "Set" },
    rcQty: 1,
    receivingPicked: { itemName: "Database Receiver", brand: "Receiver Brand DB", model: "RC-DB", unit: "Card" },
    psQty: 1,
    psuPicked: { itemName: "Database PSU", brand: "PSU Brand DB", model: "PSU-DB", unit: "Unit" },
  };
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 100,
    controllerQty: 1,
    controllerPrice: 200,
    rcQty: 1,
    unitRC: 300,
    psQty: 1,
    unitPS: 400,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-DATABASE-COLUMNS" />
    </CatalogProvider>
  );

  for (const [name, brand, model, unit] of [
    ["Database Module", "Module Brand DB", "MODULE-DB", "Pcs"],
    ["Database Controller", "Controller Brand DB", "CTRL-DB", "Pcs"],
    ["Database Receiver", "Receiver Brand DB", "RC-DB", "Pcs"],
    ["Power Supply: Database PSU", "PSU Brand DB", "PSU-DB", "Pcs"],
  ]) {
    const row = screen.getByText(name).closest("tr");
    expect(within(row).getByText(brand)).toBeInTheDocument();
    expect(within(row).getByText(model)).toBeInTheDocument();
    expect(within(row).getByText(unit)).toBeInTheDocument();
  }
  expect(within(screen.getByText("Installation, Testing & Commissioning").closest("tr")).getByText("Make")).toBeInTheDocument();
});

test("labels the pre-VAT invoice amount as Subtotal", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  const calc = calcAll({
    modulesQty: 1,
    unitModule: 1000,
    vatEnabled: true,
    accessoriesMode: "manual",
    accessoriesValue: 0,
    installMode: "manual",
    installValue: 0,
  });

  render(
    <CatalogProvider>
      <Invoice calc={calc} snapshot={snapshot} quotationRef="TEST-VAT-SUBTOTAL" />
    </CatalogProvider>
  );

  expect(screen.getByText("Subtotal =").closest("td")).toHaveClass("total-label");
  expect(screen.queryByText(/^Total =$/)).not.toBeInTheDocument();
});
