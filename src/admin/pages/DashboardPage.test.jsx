import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { get } from "../api";
import DashboardPage from "./DashboardPage";

jest.mock("../api", () => ({ get: jest.fn() }));
jest.mock("../contexts", () => ({
  useCompany: () => ({ companyId: "1", company: { name: "Mugnee Multiple Limited" } }),
  useAuth: () => ({ user: { role: "super-admin", role_name: "Super Admin" } }),
}));

const august = {
  selected_month: "2026-08",
  monthly: { quotations: "6", quoted_value: "12704456", organizations: "5" },
  previous_month: { quotations: "2", quoted_value: "3000000", organizations: "2" },
  statuses: [{ status: "final", count: "6" }],
  calculators: [{ calculator_type: "fixed", count: "6" }],
  organization_list: [{ organization_name: "ABC", quotations: "1", quoted_value: "681472" }],
  recent: [{ id: 1, quotation_number: "MUG-2026-0160", created_at: "2026-08-30T12:00:00Z", client_name: "Client", client_information: { company: "ABC" }, grand_total: "6733589", status: "final" }],
  months: [{ month: "2026-08", quotations: "6" }, { month: "2026-07", quotations: "2" }],
};

const july = {
  ...august,
  selected_month: "2026-07",
  monthly: { quotations: "2", quoted_value: "3000000", organizations: "2" },
  previous_month: { quotations: "1", quoted_value: "1000000", organizations: "1" },
  statuses: [{ status: "approved", count: "2" }],
  calculators: [{ calculator_type: "rental", count: "2" }],
  recent: [],
};

beforeEach(() => {
  get.mockImplementation((path) => Promise.resolve(path.includes("month=2026-07") ? july : august));
});

afterEach(() => {
  jest.clearAllMocks();
});

test("filters every dashboard section by the selected month", async () => {
  render(<DashboardPage />);
  const selector = await screen.findByRole("combobox", { name: "Filter dashboard by month" });

  await waitFor(() => expect(document.querySelector(".dashboard-page")).not.toHaveClass("is-loading"));
  fireEvent.change(selector, { target: { value: "2026-08" } });
  await waitFor(() => expect(get).toHaveBeenCalledWith("/admin/dashboard?companyId=1&month=2026-08"));
  await waitFor(() => expect(document.querySelector(".dashboard-page")).not.toHaveClass("is-loading"));
  expect(await screen.findByText("৳12,704,456")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "View Organizations" }));
  const organizationDialog = screen.getByRole("dialog", { name: "Organizations · August 2026" });
  expect(organizationDialog).toBeInTheDocument();
  expect(within(organizationDialog).getByText("ABC")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Close organizations" }));

  fireEvent.change(selector, { target: { value: "2026-07" } });
  await waitFor(() => expect(get).toHaveBeenCalledWith("/admin/dashboard?companyId=1&month=2026-07"));
  await waitFor(() => expect(document.querySelector(".dashboard-page")).not.toHaveClass("is-loading"));
  expect(await screen.findByText("৳3,000,000")).toBeInTheDocument();
  expect(screen.getByText("No quotations found for July 2026.")).toBeInTheDocument();
  expect(screen.getByText("Quotation Status · July 2026")).toBeInTheDocument();
});
