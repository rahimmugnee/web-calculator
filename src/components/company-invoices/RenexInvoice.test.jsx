import { render, screen, within } from "@testing-library/react";
import RenexInvoice from "./RenexInvoice.jsx";

const baseProps = {
  customer: {},
  dateStr: "23 September 2026",
  display: { widthFt: 9.45, heightFt: 5.25, sft: 49.61 },
  items: { dispType: "indoor", technology: "smd" },
  model: { name: "P1.25 Indoor" },
  refNo: "TEST-001",
  rows: [],
  company: {},
};

test("shows discount and payable rows on a non-VAT Renex quotation", () => {
  render(
    <RenexInvoice
      {...baseProps}
      showDiscountBlock
      totals={{
        vatEnabled: false,
        grandTotal: 1280290,
        discount: 5000,
        payable: 1275290,
      }}
    />
  );

  const totals = document.querySelector(".renex-totals");
  const rows = within(totals).getAllByText(/Grand Total|Special Discount|Payable/);

  expect(rows).toHaveLength(3);
  expect(totals).toHaveTextContent(/Grand Total =.*1,280,290/);
  expect(totals).toHaveTextContent(/Special Discount =.*5,000/);
  expect(totals).toHaveTextContent(/Payable =.*1,275,290/);
  expect(screen.getByText("Special Discount =")).toBeInTheDocument();
});

test("keeps the compact grand total row when discount is disabled", () => {
  render(
    <RenexInvoice
      {...baseProps}
      showDiscountBlock={false}
      totals={{ vatEnabled: false, grandTotal: 1280290 }}
    />
  );

  expect(screen.getByText("Grand Total =")).toBeInTheDocument();
  expect(screen.queryByText("Special Discount =")).not.toBeInTheDocument();
  expect(screen.queryByText("Payable =")).not.toBeInTheDocument();
});
