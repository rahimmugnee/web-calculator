import { useEffect } from "react";
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

function CatalogProbe() {
  const {
    catalog,
    company,
    paProducts = [],
    paBrands = [],
    conferenceProducts = [],
    conferenceBrands = [],
    calculatorSettings = {},
    quotationSettings,
    invoiceSettings,
    priceTiers = [],
  } = useCatalog();
  useEffect(() => { catalogProbeMounts += 1; }, []);
  return (
    <>
      <span data-testid="catalog-company">{company?.name || "No company"}</span>
      <span data-testid="catalog-cabinets">
        {(catalog.cabinetOptions || []).map((item) => item.id).join("|")}
      </span>
      <span data-testid="catalog-cabinet-brands">{(catalog.cabinetBrands || []).join("|")}</span>
      <span data-testid="catalog-cabinet-prices">
        {(catalog.cabinetOptions || []).map((item) => `${item.id}:${item.price}`).join("|")}
      </span>
      <span data-testid="catalog-led-components">
        {[
          catalog.moduleBrandPrices?.Lampro?.p1?.default,
          catalog.controllers?.find((item) => item.id === "C1")?.price,
          catalog.receivingCards?.R1?.unitPrice,
          catalog.powerSupplies?.find((item) => item.id === "PS1")?.price,
        ].join("|")}
      </span>
      <span data-testid="catalog-pa-products">
        {paProducts.map((item) => `${item.id}:${item.unitPrice}`).join("|")}
      </span>
      <span data-testid="catalog-pa-brands">{paBrands.join("|")}</span>
      <span data-testid="catalog-conference-products">
        {conferenceProducts.map((item) => `${item.id}:${item.unitPrice}`).join("|")}
      </span>
      <span data-testid="catalog-conference-brands">{conferenceBrands.join("|")}</span>
      <span data-testid="calculator-settings">{JSON.stringify(calculatorSettings)}</span>
      <span data-testid="quotation-settings">{JSON.stringify(quotationSettings || null)}</span>
      <span data-testid="invoice-settings">{JSON.stringify(invoiceSettings || null)}</span>
      <span data-testid="price-tiers">
        {priceTiers.map((item) => `${item.code || item.id}:${item.name || item.label}`).join("|")}
      </span>
    </>
  );
}

let catalogProbeMounts = 0;

const databaseCabinetRow = {
  component_type: "cabinet",
  price_tier: "default",
  unit_price: 12500,
  brand_name: "Database Brand",
  source_catalog: "admin",
  source_key: "admin:cabinet:db-only",
  model: "DB-CAB-640",
  name: "Database Cabinet 640mm x 480mm",
  unit: "Pcs",
  technical_metadata: {
    id: "database_cabinet_640x480",
    displayType: "indoor",
    materialCode: "aluminium",
    materialLabel: "Aluminium",
    sizeKey: "640x480",
    widthMm: 640,
    heightMm: 480,
    modulesPerCabinet: 6,
  },
};

const jsonResponse = (body) => Promise.resolve({
  ok: true,
  json: async () => body,
});
const originalEventSource = global.EventSource;

beforeEach(() => {
  catalogProbeMounts = 0;
  window.localStorage.clear();
  global.fetch = jest.fn((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) {
      return Promise.resolve({ ok: true, json: async () => companies });
    }
    return Promise.resolve({ ok: true, json: async () => [] });
  });
});

const allCalculatorData = (version = 1) => ({
  products: [
    { component_type: "module", system_type: "led-display", source_key: "led:module:lampro:p1", name: "P1 Module", model: "L-P1", unit: "Pcs", brand_name: "Lampro", price_tier: "default", unit_price: 100 + version, technical_metadata: { id: "p1", technology: "smd", location: "indoor" } },
    { component_type: "controller", system_type: "led-display", source_key: "led:controller:C1", name: "Controller C1", model: "C1", unit: "Pcs", brand_name: "Huidu", price_tier: "default", unit_price: 200 + version, technical_metadata: { id: "C1" } },
    { component_type: "receiving-card", system_type: "led-display", source_key: "led:receiving-card:R1", name: "Receiving Card R1", model: "R1", unit: "Pcs", brand_name: "Huidu", price_tier: "default", unit_price: 300 + version, technical_metadata: { id: "R1" } },
    { component_type: "power-supply", system_type: "led-display", source_key: "led:power-supply:PS1", name: "Power Supply PS1", model: "PS1", unit: "Pcs", brand_name: "Lampro", price_tier: "default", unit_price: 400 + version, technical_metadata: { id: "PS1" } },
    { component_type: "amplifier", system_type: "pa-system", source_key: "pa:PA1", name: "PA Amplifier", model: "PA-1", unit: "Pcs", brand_name: "CMX", price_tier: "default", unit_price: 500 + version, technical_metadata: { id: "PA1", installationType: "wired" } },
    { component_type: "control-unit", system_type: "conference-system", source_key: "conference:CONF1", name: "Conference Control Unit", model: "CONF-1", unit: "Pcs", brand_name: "Spoon", price_tier: "default", unit_price: 600 + version, technical_metadata: { id: "CONF1", systemType: "wired" } },
  ],
  calculatorSettings: {
    "fixed-led": { deliveryDays: 40 + version },
    "rental-led": { sftRate: 150 + version },
    "pa-system": { defaultWarrantyYears: version },
    "conference-system": { defaultWarrantyYears: version },
  },
  quotationSettings: { quotation_prefix: `MUG-${version}` },
  invoiceSettings: { invoice_prefix: `MUG-INV-${version}` },
  priceTiers: [{ code: "gold", name: `Gold ${version}`, warranty_years: version, is_active: true }],
});

afterEach(() => {
  jest.restoreAllMocks();
  if (originalEventSource === undefined) delete global.EventSource;
  else global.EventSource = originalEventSource;
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

test("treats a successful LED price response as authoritative for cabinet options", async () => {
  global.fetch.mockImplementation((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) return jsonResponse(companies);
    if (target.includes("/led-prices")) return jsonResponse([databaseCabinetRow]);
    return jsonResponse([]);
  });

  render(
    <CatalogProvider>
      <CatalogProbe />
    </CatalogProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId("catalog-cabinets")).toHaveTextContent("admin:cabinet:db-only");
  });
  expect(screen.getByTestId("catalog-cabinets")).not.toHaveTextContent("cabinet_outdoor_aluminium_1280x1280");
});

test("keeps successful company and LED price data when the cabinet-brand request fails", async () => {
  global.fetch.mockImplementation((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) return jsonResponse(companies);
    if (target.includes("/led-prices")) return jsonResponse([databaseCabinetRow]);
    if (target.endsWith("/public/catalog/cabinets/brands")) {
      return Promise.reject(new Error("Cabinet brands unavailable"));
    }
    return jsonResponse([]);
  });

  render(
    <CatalogProvider>
      <CatalogProbe />
    </CatalogProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId("catalog-cabinets")).toHaveTextContent("admin:cabinet:db-only");
  });
  expect(screen.getByTestId("catalog-company")).toHaveTextContent("Mugnee Multiple Limited");
  expect(screen.getByTestId("catalog-cabinet-brands")).toHaveTextContent("Database Brand");
});

test("applies a server-pushed cabinet price update without remounting the calculator", async () => {
  let cabinetPrice = 8000;
  const eventSources = [];
  global.EventSource = class FakeEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = {};
      this.close = jest.fn();
      eventSources.push(this);
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    emit(type, data) { this.listeners[type]?.({ data: JSON.stringify(data) }); }
  };
  global.fetch.mockImplementation((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) return jsonResponse(companies);
    if (target.includes("/led-prices")) return jsonResponse([{ ...databaseCabinetRow, unit_price: cabinetPrice }]);
    if (target.endsWith("/public/catalog-version")) return jsonResponse({ version: "v1" });
    return jsonResponse([]);
  });

  const view = render(
    <CatalogProvider>
      <CatalogProbe />
    </CatalogProvider>
  );

  await waitFor(() => expect(screen.getByTestId("catalog-cabinet-prices")).toHaveTextContent("admin:cabinet:db-only:8000"));
  expect(eventSources).toHaveLength(1);
  expect(eventSources[0].url).toBe("/api/public/catalog-events");

  cabinetPrice = 9000;
  act(() => eventSources[0].emit("catalog-ready", { version: "v2" }));
  await waitFor(() => expect(screen.getByTestId("catalog-cabinet-prices")).toHaveTextContent("admin:cabinet:db-only:9000"));

  cabinetPrice = 9500;
  act(() => eventSources[0].emit("catalog-change", { version: "v3" }));
  await waitFor(() => expect(screen.getByTestId("catalog-cabinet-prices")).toHaveTextContent("admin:cabinet:db-only:9500"));

  view.unmount();
  expect(eventSources[0].close).toHaveBeenCalledTimes(1);
});

test("applies server-pushed data for every calculator family without a page or provider remount", async () => {
  let dataVersion = 1;
  const eventSources = [];
  global.EventSource = class FakeEventSource {
    constructor(url) {
      this.url = url;
      this.listeners = {};
      this.close = jest.fn();
      eventSources.push(this);
    }
    addEventListener(type, listener) { this.listeners[type] = listener; }
    emit(type, data) { this.listeners[type]?.({ data: JSON.stringify(data) }); }
  };
  global.fetch.mockImplementation((url) => {
    const target = String(url);
    if (target.endsWith("/public/companies")) {
      return jsonResponse([{ ...companies[0], name: `Mugnee ${dataVersion}`, signatory_name: `Signer ${dataVersion}` }]);
    }
    if (target.includes("/calculator-data")) return jsonResponse(allCalculatorData(dataVersion));
    if (target.endsWith("/public/catalog-version")) return jsonResponse({ version: `server-${dataVersion}` });
    if (target.includes("/led-prices")) return jsonResponse(allCalculatorData(dataVersion).products.filter((row) => row.system_type === "led-display"));
    if (target.endsWith("/public/catalog/led-module/brands")) {
      return jsonResponse([{ id: 1, name: "Lampro", technical_metadata: { id: "p1" } }]);
    }
    return jsonResponse([]);
  });

  render(
    <CatalogProvider>
      <CatalogProbe />
    </CatalogProvider>
  );

  await waitFor(() => {
    expect(screen.getByTestId("catalog-company")).toHaveTextContent("Mugnee 1");
    expect(screen.getByTestId("catalog-led-components")).toHaveTextContent("101|201|301|401");
    expect(screen.getByTestId("catalog-pa-products")).toHaveTextContent("PA1:501");
    expect(screen.getByTestId("catalog-pa-brands")).toHaveTextContent("CMX");
    expect(screen.getByTestId("catalog-conference-products")).toHaveTextContent("CONF1:601");
    expect(screen.getByTestId("catalog-conference-brands")).toHaveTextContent("Spoon");
    expect(screen.getByTestId("calculator-settings")).toHaveTextContent('"sftRate":151');
    expect(screen.getByTestId("quotation-settings")).toHaveTextContent('"quotation_prefix":"MUG-1"');
    expect(screen.getByTestId("invoice-settings")).toHaveTextContent('"invoice_prefix":"MUG-INV-1"');
    expect(screen.getByTestId("price-tiers")).toHaveTextContent("gold:Gold 1");
  });
  expect(eventSources).toHaveLength(1);
  expect(catalogProbeMounts).toBe(1);

  dataVersion = 2;
  act(() => eventSources[0].emit("catalog-change", { version: "server-2" }));

  await waitFor(() => {
    expect(screen.getByTestId("catalog-company")).toHaveTextContent("Mugnee 2");
    expect(screen.getByTestId("catalog-led-components")).toHaveTextContent("102|202|302|402");
    expect(screen.getByTestId("catalog-pa-products")).toHaveTextContent("PA1:502");
    expect(screen.getByTestId("catalog-conference-products")).toHaveTextContent("CONF1:602");
    expect(screen.getByTestId("calculator-settings")).toHaveTextContent('"sftRate":152');
    expect(screen.getByTestId("quotation-settings")).toHaveTextContent('"quotation_prefix":"MUG-2"');
    expect(screen.getByTestId("invoice-settings")).toHaveTextContent('"invoice_prefix":"MUG-INV-2"');
    expect(screen.getByTestId("price-tiers")).toHaveTextContent("gold:Gold 2");
  });
  expect(catalogProbeMounts).toBe(1);
});
