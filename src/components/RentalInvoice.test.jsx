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

test("shows Included for an included rental custom field", () => {
  render(
    <RentalInvoice
      calc={{
        rows: [{
          sl: 1,
          name: "Stage Light",
          qty: 1,
          unit: "Pcs",
          rate: 0,
          duration: 1,
          amount: 0,
          included: true,
          customItem: true,
        }],
        totals: { grandTotal: 0, vatEnabled: false },
      }}
      snapshot={{ soundSystemEnabled: false, customer: {} }}
      quotationRef="TEST-003"
      company={{}}
    />
  );

  expect(screen.getByText("Stage Light")).toBeInTheDocument();
  expect(screen.getByText("Included")).toBeInTheDocument();
});
