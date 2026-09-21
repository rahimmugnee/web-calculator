import { render, screen } from "@testing-library/react";
import RentalTermsPage from "./RentalTermsPage";

test("uses the rental-specific five-day validity instead of the global validity setting", () => {
  render(
    <RentalTermsPage
      calc={{ totals: { vatEnabled: false } }}
      company={{}}
      quotationSettings={{ default_validity_days: 15 }}
    />
  );

  expect(screen.getByText("Quotation validity: 5 (Five) days from the date of issue.")).toBeInTheDocument();
  expect(screen.queryByText(/15 day/i)).not.toBeInTheDocument();
  expect(screen.getByText("Mugnee Multiple")).toBeInTheDocument();
  expect(screen.getByText("BRAC")).toBeInTheDocument();
  expect(screen.getByText("Lalbag Sub Branch (Imamganj Br)")).toBeInTheDocument();
  expect(screen.getByText("2053 2939 00 00 2")).toBeInTheDocument();
  expect(screen.getByText("060 272 807")).toBeInTheDocument();
});
