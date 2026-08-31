import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get, post, remove } from "../api";
import QuotationHistoryPage from "./QuotationHistoryPage";

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
