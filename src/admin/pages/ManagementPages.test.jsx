import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get, post } from "../api";
import { CustomersPage, SettingsPage, UsersPage } from "./ManagementPages";

jest.mock("../api", () => ({ get: jest.fn(), post: jest.fn(), put: jest.fn() }));
jest.mock("../contexts", () => ({ useCompany: () => ({ companyId: "1", company: { name: "Mugnee Multiple Limited" } }) }));

const customers = [
  { id: 1, name: "Abdur Rahim", organization: "ABC Company Ltd.", designation: "Project Manager", phone: "01712-345678", email: "rahim@abc.com", is_active: true, total_quotations: 12, quoted_value: "6800000", last_quotation_at: "2026-08-30T12:00:00Z", last_quotation_number: "MUG-2026-0076", total_count: 2, active_count: 1, all_customer_quotations: 20, all_customer_quoted_value: "9000000" },
  { id: 2, name: "Saiful Islam", organization: "Sasha Corporation", designation: "Managing Director", phone: "01819-876543", email: "saiful@sasha.com", is_active: false, total_quotations: 8, quoted_value: "2200000", last_quotation_at: "2026-08-30T12:00:00Z", last_quotation_number: "MUG-2026-0072", total_count: 2, active_count: 1, all_customer_quotations: 20, all_customer_quoted_value: "9000000" },
];

beforeEach(() => {
  jest.clearAllMocks();
  get.mockImplementation((path) => {
    if (path === "/admin/users") return Promise.resolve([{ id: 1, email: "rahim.mugnee@gmail.com", display_name: "Abdur Rahim", role_name: "Super Admin", is_active: true }]);
    if (path === "/admin/roles") return Promise.resolve([{ id: 1, name: "Super Admin" }]);
    if (path.startsWith("/admin/customers?")) return Promise.resolve(customers);
    return Promise.resolve([]);
  });
  post.mockResolvedValue({ ok: true });
});

test("renders the customer dashboard and filters by organization", async () => {
  render(<CustomersPage />);

  expect(await screen.findByText("Total Customers")).toBeInTheDocument();
  expect(await screen.findByText("৳9,000,000")).toBeInTheDocument();
  expect(screen.getByText("Abdur Rahim")).toBeInTheDocument();
  expect(screen.getByText("Saiful Islam")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("Filter by organization"), { target: { value: "Sasha Corporation" } });
  fireEvent.click(screen.getByRole("button", { name: "Filters" }));
  expect(screen.queryByText("Abdur Rahim")).not.toBeInTheDocument();
  expect(screen.getByText("Saiful Islam")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "View Saiful Islam" }));
  const dialog = screen.getByRole("dialog", { name: "Saiful Islam" });
  expect(dialog).toBeInTheDocument();
  expect(within(dialog).getByText("MUG-2026-0072")).toBeInTheDocument();
});

test("opens a centered password reset modal with confirmation", async () => {
  render(<UsersPage />);
  fireEvent.click(await screen.findByRole("button", { name: "Reset password" }));

  expect(screen.getByRole("dialog", { name: "Reset Password" })).toBeInTheDocument();
  const password = screen.getByLabelText("New password");
  const confirmation = screen.getByLabelText("Confirm password");

  fireEvent.change(password, { target: { value: "secret1" } });
  fireEvent.change(confirmation, { target: { value: "secret2" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));
  expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match");
  expect(post).not.toHaveBeenCalled();

  fireEvent.change(confirmation, { target: { value: "secret1" } });
  fireEvent.click(screen.getByRole("button", { name: "Reset Password" }));
  await waitFor(() => expect(post).toHaveBeenCalledWith("/admin/users/1/reset-password", { password: "secret1" }));
});

test("removes the JSON editor panel from the terms page", async () => {
  render(<SettingsPage type="terms" />);

  expect(await screen.findByRole("heading", { name: "Terms & Conditions" })).toBeInTheDocument();
  expect(screen.queryByText("Configuration JSON")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Save Terms" })).not.toBeInTheDocument();
});
