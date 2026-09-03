import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import CategoriesPage from "./CategoriesPage";
import { get, post, put, remove } from "../api";

jest.mock("../contexts", () => ({
  useCompany: () => ({ companyId: 1, company: { id: 1, pricing_multiplier: 1 } }),
}));

jest.mock("../api", () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  remove: jest.fn(),
}));

const categories = [
  { id: 1, parent_id: null, system_type: "led-display", slug: "led-display", name: "LED Display", is_active: true },
  { id: 2, parent_id: 1, system_type: "led-display", slug: "power-supply", name: "Power Supply", uses_brand: true, is_active: true, brand_count: 1, model_count: 1 },
];
const brands = [{ id: 10, name: "Lampro", slug: "lampro", is_active: true, categories: [{ id: 2 }] }];
const products = [{ id: 100, name: "Power Supply: LD-200", model: "LD-200", brand_name: "Lampro", brand_id: 10, unit: "Pcs", component_type: "power-supply", technical_metadata: { id: "PS_LD200" }, prices: { default: 1600 } }];

beforeEach(() => {
  get.mockImplementation((url) => {
    if (url.startsWith("/admin/categories")) return Promise.resolve(categories);
    if (url.startsWith("/admin/brands")) return Promise.resolve(brands);
    if (url.startsWith("/admin/products")) return Promise.resolve(products);
    return Promise.resolve([]);
  });
  post.mockResolvedValue({ id: 101 });
  put.mockResolvedValue({ id: 100 });
  remove.mockResolvedValue(undefined);
});

afterEach(() => {
  jest.clearAllMocks();
});

test("deletes a model from the Models table after confirmation", async () => {
  render(<CategoriesPage />);

  const deleteButton = await screen.findByRole("button", { name: "Delete LD-200" });
  fireEvent.click(deleteButton);

  let dialog = screen.getByRole("dialog", { name: "Delete model?" });
  expect(within(dialog).getByText("LD-200")).toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();

  fireEvent.click(within(dialog).getByRole("button", { name: "Cancel" }));
  expect(screen.queryByRole("dialog", { name: "Delete model?" })).not.toBeInTheDocument();

  fireEvent.click(deleteButton);
  dialog = screen.getByRole("dialog", { name: "Delete model?" });
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete Model" }));

  await waitFor(() => expect(remove).toHaveBeenCalledWith("/admin/products/100"));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete model?" })).not.toBeInTheDocument());
  expect(await screen.findByText("LD-200 moved to Recycle Bin.")).toBeInTheDocument();
});

test("uses the quotation delete design and confirmation for a selected brand", async () => {
  render(<CategoriesPage />);

  const brandFilter = within(await screen.findByLabelText("Filter by brand")).getByRole("combobox");
  fireEvent.change(brandFilter, { target: { value: "10" } });
  const deleteButton = screen.getByRole("button", { name: "Delete Brand" });
  expect(deleteButton).toHaveClass("quotation-delete-button");
  fireEvent.click(deleteButton);

  const dialog = screen.getByRole("dialog", { name: "Delete brand?" });
  expect(within(dialog).getByText("Lampro")).toBeInTheDocument();
  expect(remove).not.toHaveBeenCalled();
  fireEvent.click(within(dialog).getByRole("button", { name: "Delete Brand" }));

  await waitFor(() => expect(remove).toHaveBeenCalledWith("/admin/brands/10"));
  await waitFor(() => expect(screen.queryByRole("dialog", { name: "Delete brand?" })).not.toBeInTheDocument());
  expect(await screen.findByText("Lampro moved to Recycle Bin.")).toBeInTheDocument();
});

test("allows an existing model to be saved with No Brand", async () => {
  render(<CategoriesPage />);

  fireEvent.click(await screen.findByRole("button", { name: "Edit LD-200" }));
  const dialog = screen.getByRole("dialog");
  const brand = within(dialog).getByRole("combobox", { name: "Brand" });
  expect(within(brand).getByRole("option", { name: "No Brand" })).toBeInTheDocument();

  fireEvent.change(brand, { target: { value: "" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Save Changes" }));

  await waitFor(() => expect(put).toHaveBeenCalledWith(
    "/admin/products/100",
    expect.objectContaining({ brand_id: null })
  ));
});

test("saves an admin-selected brand on a new model", async () => {
  render(<CategoriesPage />);

  fireEvent.click(await screen.findByRole("button", { name: /Add Model/ }));
  const dialog = screen.getByRole("dialog");
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Label" }), { target: { value: "Power Supply: TEST" } });
  fireEvent.change(within(dialog).getByRole("textbox", { name: "Model" }), { target: { value: "TEST" } });
  fireEvent.change(within(dialog).getByRole("combobox", { name: "Brand" }), { target: { value: "10" } });
  fireEvent.change(within(dialog).getByRole("spinbutton", { name: "Default / Gold Price" }), { target: { value: "1000" } });
  fireEvent.click(within(dialog).getByRole("button", { name: "Add Model" }));

  await waitFor(() => expect(post).toHaveBeenCalledWith(
    "/admin/products",
    expect.objectContaining({ brand_id: 10, model: "TEST" })
  ));
});
