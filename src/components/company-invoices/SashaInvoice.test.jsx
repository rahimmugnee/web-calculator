import { render, screen } from "@testing-library/react";
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
