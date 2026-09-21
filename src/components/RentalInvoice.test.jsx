import { render, screen } from "@testing-library/react";
import RentalInvoice from "./RentalInvoice";

const calculation = {
  rows: [],
  totals: { grandTotal: 0, vatEnabled: false },
};

test("removes Sound System from rental copy when it is excluded", () => {
  render(
    <RentalInvoice
      calc={calculation}
      snapshot={{ soundSystemEnabled: false, customer: {} }}
      quotationRef="TEST-001"
      company={{}}
    />
  );

  expect(screen.getByText("Quotation For P3 Rental LED Display & Technical Support")).toBeInTheDocument();
  expect(screen.queryByText(/Sound System/)).not.toBeInTheDocument();
});

test("keeps Sound System in rental copy by default", () => {
  render(
    <RentalInvoice
      calc={calculation}
      snapshot={{ customer: {} }}
      quotationRef="TEST-002"
      company={{}}
    />
  );

  expect(screen.getByText("Quotation For P3 Rental LED Display, Sound System & Technical Support")).toBeInTheDocument();
});
