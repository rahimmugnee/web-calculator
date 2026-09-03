import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { CatalogProvider, useCatalog } from "./CatalogContext";

const companies = [
  { id: "1", name: "Mugnee Multiple Limited", code: "mugnee", is_default: true, assets: {} },
  { id: "2", name: "Renex", code: "renex", is_default: false, assets: {} },
];

function CompanyProbe() {
  const { company, setSelectedCompanyId } = useCatalog();
  return (
    <>
      <span>{company?.name || "Loading"}</span>
      <button type="button" onClick={() => setSelectedCompanyId("2")}>Select Renex</button>
    </>
  );
}

beforeEach(() => {
  window.localStorage.clear();
  global.fetch = jest.fn((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) {
      return Promise.resolve({ ok: true, json: async () => companies });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

test("resets the calculator company to Mugnee Multiple Limited when reloaded", async () => {
  window.localStorage.setItem("calculatorSelectedCompanyId", "2");

  const firstRender = render(
    <CatalogProvider>
      <CompanyProbe />
    </CatalogProvider>
  );

  expect(await screen.findByText("Mugnee Multiple Limited")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Select Renex" }));
  expect(await screen.findByText("Renex")).toBeInTheDocument();

  firstRender.unmount();
  render(
    <CatalogProvider>
      <CompanyProbe />
    </CatalogProvider>
  );

  await waitFor(() => expect(screen.getByText("Mugnee Multiple Limited")).toBeInTheDocument());
});
