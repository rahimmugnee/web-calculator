import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get, post, remove } from "../api";
import QuotationHistoryPage, { QuotationDetails } from "./QuotationHistoryPage";

jest.mock("../api", () => ({
  get: jest.fn(),
  patch: jest.fn(),
  post: jest.fn(),
  remove: jest.fn(),
}));

jest.mock("../contexts", () => ({
  useCompany: () => ({ companyId: "1" }),
}));

const quotation = {
  id: 7,
  quotation_number: "MUG-2026-0160",
  created_at: "2026-08-30T12:00:00.000Z",
  updated_at: "2026-08-30T12:30:00.000Z",
  client_name: "Abdur Rahim",
  client_information: { name: "Abdur Rahim", company: "ABC Ltd", phone: "01700000000" },
  grand_total: 6733589,
  created_by_name: "Admin",
  status: "final",
  company_name: "Mugnee Multiple Limited",
  calculator_type: "fixed",
  snapshot_data: { form: { model: { name: "P2.5 Outdoor" }, items: { technology: "smd" }, display: { widthFt: 25.2, heightFt: 15.75, sft: 396.9 } } },
  items: [{ id: 1, line_number: 1, item_description: "LED Display Module", model_description: "P2.5 Outdoor", unit: "Pcs", quantity: 720, unit_price: 6825, total_price: 4914000, snapshot_data: { brand: "Lampro" } }],
  total_count: 1,
};

beforeEach(() => {
  get.mockImplementation((path) => Promise.resolve(path === "/admin/quotations/7" ? quotation : [quotation]));
  post.mockResolvedValue({ viewed_at: "2026-08-30T13:00:00.000Z" });
  remove.mockResolvedValue(null);
});

test("shows the serial number as the first quotation table column", async () => {
  render(<QuotationHistoryPage />);
  const serialHeader = await screen.findByRole("columnheader", { name: "SL No." });
  const table = serialHeader.closest("table");
  const quotationCell = await screen.findByText(quotation.quotation_number);
  const quotationRow = quotationCell.closest("tr");

  expect(within(table).getAllByRole("columnheader")[0]).toBe(serialHeader);
  expect(within(quotationRow).getAllByRole("cell")[0]).toHaveTextContent("1");
});

test("shows the taka symbol in quotation price headers", () => {
  render(<QuotationDetails titleId="price-header-title" row={quotation} onClose={jest.fn()} />);

  expect(screen.getByRole("columnheader", { name: "Unit Price ৳" })).toBeInTheDocument();
  expect(screen.getByRole("columnheader", { name: "Total Price ৳" })).toBeInTheDocument();
});

test("uses a centered confirmation modal before deleting a quotation", async () => {
  render(<QuotationHistoryPage />);
  const deleteButton = await screen.findByRole("button", { name: "Delete" });

  fireEvent.click(deleteButton);
  let dialog = screen.getByRole("dialog", { name: "Delete quotation?" });
  expect(within(dialog).getByText(/MUG-2026-0160/)).toBeInTheDocument();
  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Delete quotation?" })).not.toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();

  fireEvent.click(deleteButton);
  dialog = screen.getByRole("dialog", { name: "Delete quotation?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete Quotation" }));
  await waitFor(() => expect(remove).toHaveBeenCalledWith("/admin/quotations/7"));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete quotation?" })).not.toBeInTheDocument());
});

afterEach(() => {
  jest.clearAllMocks();
});

test("opens quotation details in a constrained modal preview and closes it with Escape", async () => {
  const { container } = render(<QuotationHistoryPage />);
  const viewButton = await screen.findByRole("button", { name: "View Quotation" });

  expect(screen.queryByRole("heading", { name: "Quotation Details" })).not.toBeInTheDocument();
  fireEvent.click(viewButton);

  expect(await screen.findByRole("heading", { name: "Quotation Details" })).toBeInTheDocument();
  expect(screen.getByRole("dialog", { name: "Quotation Details" })).toHaveClass("quotation-preview-modal");
  expect(container.querySelector("tr.quotation-expanded-row")).not.toBeInTheDocument();
  expect(container.querySelector(".quotation-client-grid")).toBeInTheDocument();
  expect(container.querySelectorAll(".quotation-client-grid > div")).toHaveLength(5);
  ["Name:", "Designation:", "Organization:", "Mobile Number:", "Address:"].forEach((label) => expect(screen.getByText(label)).toBeInTheDocument());
  expect(screen.queryByRole("heading", { name: "Quotation Information" })).not.toBeInTheDocument();
  expect(screen.getByRole("heading", { name: "Proposal for P2.5 Outdoor (SMD) LED Display. (25.2ft × 15.75ft) | Sft: (396.9)" })).toBeInTheDocument();
  expect(document.body).toHaveStyle({ overflow: "hidden" });

  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("heading", { name: "Quotation Details" })).not.toBeInTheDocument());
  expect(document.body).not.toHaveStyle({ overflow: "hidden" });
});

test("shows Subtotal, VAT and Grand Total rows for a VAT quotation", () => {
  const vatQuotation = {
    ...quotation,
    subtotal: 625523,
    vat_amount: 62553,
    discount_amount: 0,
    grand_total: 688076,
    snapshot_data: {
      ...quotation.snapshot_data,
      calculation: { totals: { totalBeforeVat: 625523, vatAmount: 62553, vatRate: 0.1, vatEnabled: true, grandTotal: 688076 } },
    },
  };

  const { container } = render(<QuotationDetails titleId="vat-quotation-title" row={vatQuotation} onClose={jest.fn()} />);
  const footerRows = [...container.querySelectorAll(".quotation-items-wrap tfoot tr")];

  expect(footerRows).toHaveLength(3);
  expect(footerRows[0]).toHaveTextContent(/Subtotal.*625,523/);
  expect(footerRows[1]).toHaveTextContent(/VAT \(10%\).*62,553/);
  expect(footerRows[2]).toHaveTextContent(/Grand Total.*688,076/);
});

test("shows only the component model name in the quotation preview", () => {
  const componentQuotation = {
    ...quotation,
    items: [
      { id: 2, line_number: 1, item_description: "Controller", model_description: "Controller: TU-15 Pro", unit: "Pcs", quantity: 1, unit_price: 150000, total_price: 150000, snapshot_data: { brand: "Novastar" } },
      { id: 3, line_number: 2, item_description: "Receiving Card", model_description: "Receiving Card: NV3210", unit: "Pcs", quantity: 1, unit_price: 4000, total_price: 4000, snapshot_data: { brand: "Novastar" } },
      { id: 4, line_number: 3, item_description: "Power Supply", model_description: "", unit: "Pcs", quantity: 1, unit_price: 1600, total_price: 1600, snapshot_data: { brand: "Lampro" } },
      { id: 5, line_number: 4, item_description: "Power Supply", model_description: "", unit: "Pcs", quantity: 1, unit_price: 1600, total_price: 1600, snapshot_data: { brand: "Mean well" } },
      { id: 6, line_number: 5, item_description: "Power Supply", model_description: "", unit: "Pcs", quantity: 1, unit_price: 1600, total_price: 1600, snapshot_data: { brand: "G-Energy" } },
      { id: 7, line_number: 6, item_description: "Structure & Accessories", model_description: "null", unit: "Lot", quantity: 1, unit_price: 24000, total_price: 24000, snapshot_data: { brand: null } },
    ],
  };

  render(<QuotationDetails titleId="component-model-title" row={componentQuotation} onClose={jest.fn()} />);

  expect(screen.getByText("TU-15 Pro")).toBeInTheDocument();
  expect(screen.getByText("NV3210")).toBeInTheDocument();
  expect(screen.getByText("LD-200")).toBeInTheDocument();
  expect(screen.getByText("LRS-200")).toBeInTheDocument();
  expect(screen.getByText("N200V5-A")).toBeInTheDocument();
  expect(screen.queryByText("Controller: TU-15 Pro")).not.toBeInTheDocument();
  expect(screen.queryByText("Receiving Card: NV3210")).not.toBeInTheDocument();
  const structureRow = screen.getByText("Structure & Accessories").closest("tr");
  const structureCells = within(structureRow).getAllByRole("cell");
  expect(structureCells[1]).toHaveClass("quotation-item-name");
  expect(structureCells[2]).toHaveTextContent("—");
  expect(structureCells[3]).toHaveTextContent("—");
  expect(within(structureRow).queryByText("null")).not.toBeInTheDocument();
});
