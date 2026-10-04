import { render, screen } from "@testing-library/react";
import TermsPage from "./TermsPage.jsx";
import { useCatalog } from "../context/CatalogContext.jsx";

jest.mock("../context/CatalogContext.jsx", () => ({ useCatalog: jest.fn() }));

const snapshot = { paymentTermId: "PT_100", deliveryDays: 45, customWarranty: "2" };

test.each(["mugnee", "mugnee-multiple"])("keeps the existing terms format for %s", (code) => {
  useCatalog.mockReturnValue({ company: { code }, quotationSettings: {} });
  const { container } = render(<TermsPage snapshot={snapshot} calc={{ totals: {} }} />);
  expect(container.querySelector(".terms-format-mugnee .terms-title")).toHaveTextContent("Terms & Conditions");
  expect(container.querySelector(".renex-terms-heading")).toBeNull();
});

test("Renex uses numbered sections and preserves selected commercial terms", () => {
  useCatalog.mockReturnValue({ company: { code: "renex" }, quotationSettings: { default_validity_days: 21, terms: ["Project access must be arranged."] } });
  const { container } = render(<TermsPage snapshot={snapshot} calc={{ totals: { vatEnabled: true } }} />);
  expect(screen.getByRole("heading", { name: "TERMS & CONDITIONS" })).toBeInTheDocument();
  expect(container.querySelectorAll(".renex-terms-number")).toHaveLength(5);
  expect(container.querySelector(".terms-title")).toBeNull();
  expect(screen.getByText("inclusive of VAT & taxes")).toBeInTheDocument();
  expect(screen.getByText("21 day(s)")).toBeInTheDocument();
  expect(screen.getByText("45 days")).toBeInTheDocument();
  expect(screen.getByText("100%")).toBeInTheDocument();
  expect(container).toHaveTextContent("2-year(s) full coverage");
  expect(screen.getByText("Project access must be arranged.")).toBeInTheDocument();
});

test.each(["renex", "sasha"])("%s keeps the rental-specific terms when rendering a rental quotation", (code) => {
  useCatalog.mockReturnValue({ company: { code }, quotationSettings: {} });
  const { container } = render(<TermsPage snapshot={{ quotationType: "rental" }} calc={{ totals: {} }} />);
  expect(container.querySelector(".rental-terms-page")).toBeInTheDocument();
  expect(container.querySelector(".terms-format-renex")).toBeNull();
  expect(container.querySelector(".terms-format-sasha")).toBeNull();
});

test.each(["PT_100", "PT_50_50"])("Sasha renders independent lettered sections with dynamic %s payment rows", (paymentTermId) => {
  useCatalog.mockReturnValue({ company: { code: "sasha" }, quotationSettings: { default_validity_days: 21, terms: ["Project access must be arranged."] } });
  const { container } = render(<TermsPage snapshot={{ ...snapshot, paymentTermId }} calc={{ totals: { vatEnabled: true } }} />);
  expect(screen.getByRole("heading", { name: "TERMS & CONDITIONS" })).toBeInTheDocument();
  expect(Array.from(container.querySelectorAll(".sasha-terms-letter span"), (element) => element.textContent)).toEqual(["A.", "B.", "C.", "D.", "E."]);
  expect(container.querySelector(".terms-title, .renex-terms-heading")).toBeNull();
  const paymentRows = container.querySelectorAll(".sasha-terms-payment-box .sasha-terms-row");
  expect(paymentRows).toHaveLength(paymentTermId === "PT_100" ? 1 : 2);
  expect(paymentRows[0]).toHaveTextContent(paymentTermId === "PT_100" ? "100%" : "50%");
  expect(screen.getByText("inclusive of VAT & taxes")).toBeInTheDocument();
  expect(screen.getByText("21 day(s)")).toBeInTheDocument();
  expect(screen.getByText("45 days")).toBeInTheDocument();
  expect(container).toHaveTextContent("2-year(s) full coverage");
  expect(screen.getByText("Project access must be arranged.")).toBeInTheDocument();
});
