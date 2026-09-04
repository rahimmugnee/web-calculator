import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { componentModelAndPrice } from "../data/component-model-and-price.js";
import { conferenceProducts as staticConferenceProducts } from "../data/conferenceProducts.js";
import { paProducts as staticPaProducts } from "../data/paProducts.js";
import { applyLedPriceRows } from "../lib/apply-led-price-rows.js";
import { applyRuntimeProductRows } from "../lib/apply-runtime-product-rows.js";
import { loadQuotationCatalog } from "../lib/load-quotation-catalog.js";
import { normalizeRuntimeSettings } from "../lib/runtime-settings.js";

const CatalogContext = createContext(null);
const API_BASE = process.env.REACT_APP_ADMIN_API_URL || "/api";
const LIVE_REFRESH_DEBOUNCE_MS = 100;
const LIVE_VERSION_POLL_MS = 10000;

function runtimePriceTiers(rows, fallback = []) {
  if (!Array.isArray(rows)) return fallback;
  const supported = new Set(fallback.map((tier) => tier.id));
  const mapped = rows
    .filter((row) => supported.has(String(row.code || "")))
    .map((row) => ({
      id: String(row.code),
      label: row.name || String(row.code),
      note: row.description || "",
      warrantyYears: Number(row.warranty_years) || 0,
    }));
  return mapped.length ? mapped : fallback;
}

function productBrands(products) {
  const nonSelectableBrands = new Set(["generic", "mugnee multiple limited"]);
  const values = products
    .map((product) => String(product.brand || "").trim())
    .filter((brand) => brand && !nonSelectableBrands.has(brand.toLowerCase()));
  return [...new Set(values)];
}

export function CatalogProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState("");
  const [catalog, setCatalog] = useState(componentModelAndPrice);
  const [paProducts, setPaProducts] = useState(staticPaProducts);
  const [conferenceProducts, setConferenceProducts] = useState(staticConferenceProducts);
  const [runtimeSettings, setRuntimeSettings] = useState(() => normalizeRuntimeSettings());
  const [priceTiers, setPriceTiers] = useState(componentModelAndPrice.priceTiers || []);
  const catalogRequestId = useRef(0);
  const loadedCompanyId = useRef("");
  const catalogLoadFailed = useRef(false);
  const loadCompany = useCallback(async () => {
    const requestId = ++catalogRequestId.current;
    try {
      const [{ catalog: fallbackCatalog }, companyResponse] = await Promise.all([
        loadQuotationCatalog(),
        fetch(`${API_BASE}/public/companies`, { cache: "no-store" }),
      ]);
      if (requestId !== catalogRequestId.current) return;
      if (!companyResponse.ok) throw new Error("Company list unavailable");
      const companyRows = await companyResponse.json();
      const profile = companyRows.find((item) => String(item.id) === String(selectedCompanyId))
        || companyRows.find((item) => item.name === "Mugnee Multiple Limited")
        || companyRows.find((item) => item.is_default)
        || companyRows[0];
      if (!profile) throw new Error("Company branding unavailable");
      const apiOrigin = new URL(API_BASE, window.location.origin).origin;
      const assets = Object.fromEntries(Object.entries(profile.assets || {}).map(([key, path]) => [key, `${apiOrigin}${path}?v=${Date.now()}`]));
      const readJson = async (url) => {
        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`Catalog request failed: ${url}`);
        return response.json();
      };
      const [calculatorDataResult, brandRowsResult, cabinetBrandRowsResult] = await Promise.allSettled([
        readJson(`${API_BASE}/public/company/${profile.id}/calculator-data`),
        readJson(`${API_BASE}/public/catalog/led-module/brands`),
        readJson(`${API_BASE}/public/catalog/cabinets/brands`),
      ]);
      if (requestId !== catalogRequestId.current) return;
      const calculatorData = calculatorDataResult.status === "fulfilled"
        && calculatorDataResult.value
        && !Array.isArray(calculatorDataResult.value)
        && Array.isArray(calculatorDataResult.value.products)
        ? calculatorDataResult.value
        : null;
      const rowsResult = calculatorData
        ? { status: "fulfilled", value: calculatorData.products }
        : await Promise.resolve(readJson(`${API_BASE}/public/company/${profile.id}/led-prices`))
          .then((value) => ({ status: "fulfilled", value }), (reason) => ({ status: "rejected", reason }));
      if (requestId !== catalogRequestId.current) return;
      const hasLiveRows = rowsResult.status === "fulfilled" && Array.isArray(rowsResult.value);
      const hasModuleBrandRows = brandRowsResult.status === "fulfilled" && Array.isArray(brandRowsResult.value);
      const hasCabinetBrandRows = cabinetBrandRowsResult.status === "fulfilled" && Array.isArray(cabinetBrandRowsResult.value);
      const rows = hasLiveRows ? rowsResult.value : [];
      const ledRows = calculatorData ? rows.filter((row) => row.system_type === "led-display") : rows;
      const brandRows = hasModuleBrandRows ? brandRowsResult.value : [];
      const companyChanged = String(loadedCompanyId.current) !== String(profile.id);
      const liveCatalog = hasLiveRows
        ? applyLedPriceRows(fallbackCatalog, ledRows, brandRows, { authoritative: true })
        : companyChanged ? fallbackCatalog : null;
      const cabinetBrandRows = hasCabinetBrandRows ? cabinetBrandRowsResult.value : [];
      setCompanies(companyRows);
      setCompany({ ...profile, assets });
      loadedCompanyId.current = String(profile.id);
      if (liveCatalog) {
        const nextPriceTiers = calculatorData
          ? runtimePriceTiers(calculatorData.priceTiers, liveCatalog.priceTiers || fallbackCatalog.priceTiers)
          : liveCatalog.priceTiers || fallbackCatalog.priceTiers;
        setPriceTiers(nextPriceTiers);
        setCatalog({
          ...liveCatalog,
          priceTiers: nextPriceTiers,
          cabinetBrands: [...new Set([
            ...(liveCatalog.cabinetBrands || []),
            ...cabinetBrandRows.map((row) => row.name).filter(Boolean),
          ])],
        });
      }
      if (calculatorData) {
        setPaProducts(applyRuntimeProductRows(staticPaProducts, rows, { systemType: "pa-system", authoritative: true }));
        setConferenceProducts(applyRuntimeProductRows(staticConferenceProducts, rows, { systemType: "conference-system", authoritative: true }));
        setRuntimeSettings(normalizeRuntimeSettings({
          calculators: calculatorData.calculatorSettings,
          quotation: calculatorData.quotationSettings,
          invoice: calculatorData.invoiceSettings,
        }));
      } else if (companyChanged) {
        setPaProducts(staticPaProducts);
        setConferenceProducts(staticConferenceProducts);
        setRuntimeSettings(normalizeRuntimeSettings());
        setPriceTiers(fallbackCatalog.priceTiers || []);
      }
      catalogLoadFailed.current = !calculatorData || !hasLiveRows || !hasModuleBrandRows || !hasCabinetBrandRows;
      const favicon = document.querySelector("link[rel='icon']");
      if (favicon && assets.site_logo) favicon.href = assets.site_logo;
    } catch {
      if (requestId === catalogRequestId.current) catalogLoadFailed.current = true;
    }
  }, [selectedCompanyId]);
  useEffect(() => {
    loadCompany();
    return () => { catalogRequestId.current += 1; };
  }, [loadCompany]);
  useEffect(() => {
    let refreshTimer;
    let knownServerVersion = "";
    let stopped = false;
    const refresh = () => {
      if (stopped || document.visibilityState === "hidden") return;
      clearTimeout(refreshTimer);
      refreshTimer = setTimeout(() => loadCompany(), LIVE_REFRESH_DEBOUNCE_MS);
    };
    let channel;
    try { channel = new BroadcastChannel("calculator-live-updates"); channel.addEventListener("message", refresh); } catch {}
    const storageRefresh = (event) => { if (event.key === "calculatorLiveUpdate") refresh(); };
    const rememberServerVersion = (event) => {
      try {
        const nextVersion = String(JSON.parse(event.data)?.version || "");
        if (!nextVersion) return false;
        const changed = !knownServerVersion || knownServerVersion !== nextVersion;
        knownServerVersion = nextVersion;
        return changed;
      } catch { return false; }
    };
    const serverReady = (event) => { if (rememberServerVersion(event)) refresh(); };
    const serverRefresh = (event) => {
      rememberServerVersion(event);
      refresh();
    };
    let eventSource;
    try {
      if (typeof EventSource === "function") {
        eventSource = new EventSource(`${API_BASE}/public/catalog-events`);
        eventSource.addEventListener("catalog-ready", serverReady);
        eventSource.addEventListener("catalog-change", serverRefresh);
      }
    } catch {}
    const checkServerVersion = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const response = await fetch(`${API_BASE}/public/catalog-version`, { cache: "no-store" });
        if (!response.ok) return;
        const nextVersion = String((await response.json())?.version || "");
        if (stopped || !nextVersion) return;
        if (!knownServerVersion) {
          knownServerVersion = nextVersion;
          refresh();
        }
        else if (knownServerVersion !== nextVersion) {
          knownServerVersion = nextVersion;
          refresh();
        } else if (catalogLoadFailed.current) refresh();
      } catch {}
    };
    const visibleRefresh = () => {
      if (document.visibilityState === "visible") refresh();
    };
    window.addEventListener("storage", storageRefresh);
    window.addEventListener("calculator-admin-change", refresh);
    window.addEventListener("focus", visibleRefresh);
    document.addEventListener("visibilitychange", visibleRefresh);
    checkServerVersion();
    const versionPoll = setInterval(checkServerVersion, LIVE_VERSION_POLL_MS);
    return () => {
      stopped = true;
      clearTimeout(refreshTimer);
      clearInterval(versionPoll);
      channel?.close();
      eventSource?.close();
      window.removeEventListener("storage", storageRefresh);
      window.removeEventListener("calculator-admin-change", refresh);
      window.removeEventListener("focus", visibleRefresh);
      document.removeEventListener("visibilitychange", visibleRefresh);
    };
  }, [loadCompany]);
  const setSelectedCompanyId = useCallback((companyId) => {
    const value = String(companyId || "");
    setSelectedCompanyIdState(value);
  }, []);
  const paBrands = useMemo(() => productBrands(paProducts), [paProducts]);
  const conferenceBrands = useMemo(() => productBrands(conferenceProducts), [conferenceProducts]);
  const value = useMemo(() => ({
    catalog,
    company,
    companies,
    paProducts,
    paBrands,
    conferenceProducts,
    conferenceBrands,
    calculatorSettings: runtimeSettings.calculators,
    quotationSettings: runtimeSettings.quotation,
    invoiceSettings: runtimeSettings.invoice,
    priceTiers,
    selectedCompanyId: String(company?.id || selectedCompanyId),
    setSelectedCompanyId,
  }), [catalog,company,companies,paProducts,paBrands,conferenceProducts,conferenceBrands,runtimeSettings,priceTiers,selectedCompanyId,setSelectedCompanyId]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
