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

test("renders COB P1.25 as an Sft display and omits receiving card and power supply", () => {
  const snapshot = buildSnapshot({ enabled: false, name: "", price: 0 });
  snapshot.model = { id: "cob-in-p1_25", name: "P1.25 Indoor" };
  snapshot.display.sft = "12";
  snapshot.items = {
    ...snapshot.items,
    cobP125SftPricing: true,
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

  const displayRow = screen.getByText("P1.25 COB LED Display with Cabinet").closest("tr");
  expect(within(displayRow).getByText("Sft")).toBeInTheDocument();
  expect(within(displayRow).getByText("12")).toBeInTheDocument();
  expect(screen.queryByText("Receiving Card: NV3210")).not.toBeInTheDocument();
  expect(screen.queryByText("Power Supply")).not.toBeInTheDocument();
});
