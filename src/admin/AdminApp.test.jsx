import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import AdminApp from "./AdminApp";

beforeEach(() => {
  window.history.replaceState({}, "", "/admin/login");
  global.fetch = jest.fn().mockResolvedValue({ ok: false, status: 401, json: async () => ({ error: "Authentication required." }) });
});

test("renders the Calculator admin login and toggles password visibility", async () => {
  render(<AdminApp />);
  expect(screen.getByRole("heading", { name: "Calculator" })).toBeInTheDocument();
  const password = screen.getByLabelText("Password");
  expect(password).toHaveAttribute("type", "password");
  fireEvent.click(screen.getByRole("button", { name: "Show password" }));
  expect(password).toHaveAttribute("type", "text");
  await waitFor(() => expect(global.fetch).toHaveBeenCalled());
});

test("renders protected dashboard navigation for an authenticated administrator", async () => {
  window.history.replaceState({}, "", "/admin/dashboard");
  global.fetch = jest.fn(async (url) => {
    if (String(url).includes("/auth/me")) return { ok: true, status: 200, json: async () => ({ user: { id: 1, email: "rahim.mugnee@gmail.com", display_name: "Administrator", role_name: "Super Admin", permissions: [] } }) };
    if (String(url).includes("/admin/companies")) return { ok: true, status: 200, json: async () => ([{ id: 1, name: "Mugnee Multiple Limited", code: "mugnee", is_default: true }]) };
    return { ok: true, status: 200, json: async () => ({ products: 244, quotations: 0, invoices: 0, customers: 0 }) };
  });
  render(<AdminApp />);
  expect(await screen.findByRole("heading", { name: "Dashboard" })).toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Company Prices/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Pricing Tiers/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Bulk Price Update/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Invoices$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /Invoice Layout/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^LED Display$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Rental LED$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^PA System$/ })).not.toBeInTheDocument();
  expect(screen.queryByRole("link", { name: /^Conference System$/ })).not.toBeInTheDocument();
  expect((await screen.findAllByText("Mugnee Multiple Limited")).length).toBeGreaterThan(0);
});
