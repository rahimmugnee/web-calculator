import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get, post, remove } from "../api";
import RecycleBinPage from "./RecycleBinPage";

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  remove: jest.fn(),
}));

jest.mock("../contexts", () => ({
  useCompany: () => ({ companyId: "1" }),
}));

const quotation = {
  id: 7,
  quotation_number: "MUG-2026-0066",
  deleted_at: "2026-08-31T16:18:25.000Z",
  client_name: "Abdur Rahim",
  client_information: { company: "Sasha Corporation" },
  grand_total: 3176100,
  status: "sent",
};

const quotationDetails = {
  ...quotation,
  created_at: "2026-08-30T12:00:00.000Z",
  updated_at: "2026-08-30T12:30:00.000Z",
  created_by_name: "Admin",
  snapshot_data: { form: { model: { name: "P2.5 Outdoor" }, items: { technology: "smd" }, display: { widthFt: 25.2, heightFt: 15.75, sft: 396.9 } } },
  items: [{ id: 1, line_number: 1, item_description: "LED Display Module", model_description: "P2.5 Outdoor", unit: "Pcs", quantity: 720, unit_price: 4411.25, total_price: 3176100, snapshot_data: { brand: "Lampro" } }],
};

beforeEach(() => {
  get.mockImplementation((path) => Promise.resolve(path.includes("/trash/7?") ? quotationDetails : [quotation]));
  post.mockResolvedValue({});
  remove.mockResolvedValue(null);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("requires confirmation before permanently deleting a recycled quotation", async () => {
  render(<RecycleBinPage />);
  const deleteButton = await screen.findByRole("button", { name: "Delete Permanently" });

  fireEvent.click(deleteButton);
  let dialog = screen.getByRole("dialog", { name: "Delete permanently?" });
  expect(within(dialog).getByText(/MUG-2026-0066/)).toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Delete permanently?" })).not.toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();

  fireEvent.click(deleteButton);
  dialog = screen.getByRole("dialog", { name: "Delete permanently?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete Permanently" }));

  await waitFor(() => expect(remove).toHaveBeenCalledWith("/admin/quotations/7/permanent"));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete permanently?" })).not.toBeInTheDocument());
});

test("requires confirmation before restoring a recycled quotation", async () => {
  render(<RecycleBinPage />);
  const restoreButton = await screen.findByRole("button", { name: "Restore" });

  fireEvent.click(restoreButton);
  let dialog = screen.getByRole("dialog", { name: "Restore quotation?" });
  expect(within(dialog).getByText(/MUG-2026-0066/)).toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Restore quotation?" })).not.toBeInTheDocument();
  expect(post).not.toHaveBeenCalled();

  fireEvent.click(restoreButton);
  dialog = screen.getByRole("dialog", { name: "Restore quotation?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Restore Quotation" }));

  await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/quotations/7/restore", {}));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Restore quotation?" })).not.toBeInTheDocument());
});

test("shows the full recycled quotation in a modal before the status column", async () => {
  render(<RecycleBinPage />);
  const viewButton = await screen.findByRole("button", { name: "View Quotation" });
  const table = viewButton.closest("table");
  const headers = within(table).getAllByRole("columnheader");

  expect(headers.findIndex((header) => header.textContent === "View")).toBeLessThan(headers.findIndex((header) => header.textContent === "Status"));
  fireEvent.click(viewButton);

  const dialog = await screen.findByRole("dialog", { name: "Quotation Details" });
  expect(dialog).toHaveClass("quotation-preview-modal");
  expect(get).toHaveBeenCalledWith("/admin/quotations/trash/7?companyId=1");
  expect(within(dialog).getByText("LED Display Module")).toBeInTheDocument();
  expect(within(dialog).getByText("Lampro")).toBeInTheDocument();
  expect(within(dialog).getByText("P2.5 Outdoor")).toBeInTheDocument();

  fireEvent.keyDown(window, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Quotation Details" })).not.toBeInTheDocument());
});
