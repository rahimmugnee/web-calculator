import { render, screen, within } from "@testing-library/react";
import SashaInvoice from "./SashaInvoice.jsx";

const baseProps = {
  customer: {},
  dateStr: "23 September 2026",
  display: { widthFt: 9.45, heightFt: 5.25, sft: 49.61 },
  items: { dispType: "indoor", technology: "smd", brands: {} },
  model: { name: "P1.25 Indoor" },
  refNo: "TEST-001",
  rows: [],
  company: {},
};

test("shows custom items before accessories without adding them to the display price", () => {
  render(<SashaInvoice {...baseProps}
    rows={[
      { sl: 1, name: "LED Module", unit: "Pcs", qty: 1, total: 10000 },
      { sl: 2, type: "custom", name: "Spare Module", unit: "Pcs", qty: 1, unitPrice: 5000, total: 5000 },
      { sl: 3, type: "custom", name: "Controller Backup", unit: "Pcs", qty: 1, unitPrice: 2000, total: 2000 },
      { sl: 4, name: "Structure & Accessories", unit: "Lot", qty: 1, unitPrice: 1000, total: 1000 },
    ]}
    totals={{ grandTotal: 18000 }}
  />);
  const rows = document.querySelectorAll(".sasha-invoice-table tbody tr");
  expect(rows[0]).toHaveTextContent(/10,000/);
  expect(rows[0]).not.toHaveTextContent(/17,000/);
  expect(rows[0]).not.toHaveTextContent("Controller Model:");
  expect(rows[1]).toHaveTextContent("Spare Module");
  expect(within(rows[1]).getAllByRole("cell").map((cell) => cell.textContent))
    .toEqual(["2", "Spare Module", "Pcs", "1", expect.stringContaining("5,000"), expect.stringContaining("5,000")]);
  expect(rows[2]).toHaveTextContent("Controller Backup");
  expect(rows[3]).toHaveTextContent("Structure & Accessories");
  expect(rows[3].firstChild).toHaveTextContent("4");
  expect(rows[4]).toHaveTextContent(/18,000/);
});

test("shows discount and payable rows on a Sasha quotation", () => {
  render(
    <SashaInvoice
      {...baseProps}
      showDiscountBlock
      totals={{
        grandTotal: 1311944,
        discount: 10000,
        payable: 1301944,
      }}
    />
  );

  expect(screen.getByText("Grand Total =").closest("tr")).toHaveTextContent(/1,311,944/);
  expect(screen.getByText("Special Discount =").closest("tr")).toHaveTextContent(/10,000/);
  expect(screen.getByText("Payable =").closest("tr")).toHaveTextContent(/1,301,944/);
  expect(document.querySelectorAll(".sasha-summary-label")).toHaveLength(3);
  expect(document.querySelectorAll(".sasha-summary-amount")).toHaveLength(3);
});

test("keeps only the grand total row when Sasha discount is disabled", () => {
  render(
    <SashaInvoice
      {...baseProps}
      showDiscountBlock={false}
      totals={{ grandTotal: 1311944 }}
    />
  );

  expect(screen.getByText("Grand Total =")).toBeInTheDocument();
  expect(screen.queryByText("Special Discount =")).not.toBeInTheDocument();
  expect(screen.queryByText("Payable =")).not.toBeInTheDocument();
});
