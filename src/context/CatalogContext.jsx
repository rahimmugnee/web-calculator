import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { componentModelAndPrice } from "../data/component-model-and-price.js";
import { applyLedPriceRows } from "../lib/apply-led-price-rows.js";
import { loadQuotationCatalog } from "../lib/load-quotation-catalog.js";

const CatalogContext = createContext(null);
const SELECTED_COMPANY_KEY = "calculatorSelectedCompanyId";

export function CatalogProvider({ children }) {
  const [company, setCompany] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyId, setSelectedCompanyIdState] = useState(() => window.localStorage.getItem(SELECTED_COMPANY_KEY) || "");
  const [catalog, setCatalog] = useState(componentModelAndPrice);
  const catalogRequestId = useRef(0);
  const loadCompany = useCallback(async () => {
    const requestId = ++catalogRequestId.current;
    const apiBase = process.env.REACT_APP_ADMIN_API_URL || "/api";
    try {
      const [{ catalog: fallbackCatalog }, companyResponse] = await Promise.all([
        loadQuotationCatalog(),
        fetch(`${apiBase}/public/companies`, { cache: "no-store" }),
      ]);
      if (requestId !== catalogRequestId.current) return;
      setCatalog(fallbackCatalog);
      if (!companyResponse.ok) throw new Error("Company list unavailable");
      const companyRows = await companyResponse.json();
      setCompanies(companyRows);
      const profile = companyRows.find((item) => String(item.id) === String(selectedCompanyId))
        || companyRows.find((item) => item.is_default)
        || companyRows[0];
      if (!profile) throw new Error("Company branding unavailable");
      const apiOrigin = new URL(apiBase, window.location.origin).origin;
      const assets = Object.fromEntries(Object.entries(profile.assets || {}).map(([key, path]) => [key, `${apiOrigin}${path}?v=${Date.now()}`]));
      if (requestId !== catalogRequestId.current) return undefined;
      setCompany({ ...profile, assets });
      const favicon = document.querySelector("link[rel='icon']");
      if (favicon && assets.site_logo) favicon.href = assets.site_logo;
      const [rows, brandRows] = await Promise.all([
        fetch(`${apiBase}/public/company/${profile.id}/led-prices`, { cache: "no-store" }).then((response)=>response.ok?response.json():[]),
        fetch(`${apiBase}/public/catalog/led-module/brands`, { cache: "no-store" }).then((response)=>response.ok?response.json():[]),
      ]);
      if (requestId !== catalogRequestId.current) return;
      setCatalog(applyLedPriceRows(fallbackCatalog, rows, brandRows));
    } catch {
      if (requestId === catalogRequestId.current) setCompany(null);
    }
  }, [selectedCompanyId]);
  useEffect(() => { loadCompany(); }, [loadCompany]);
  useEffect(() => {
    const refresh = () => loadCompany();
    let channel;
    try { channel = new BroadcastChannel("calculator-live-updates"); channel.addEventListener("message", refresh); } catch {}
    const storageRefresh = (event) => { if (event.key === "calculatorLiveUpdate") refresh(); };
    window.addEventListener("storage", storageRefresh);
    window.addEventListener("calculator-admin-change", refresh);
    window.addEventListener("focus", refresh);
    return () => { channel?.close(); window.removeEventListener("storage", storageRefresh); window.removeEventListener("calculator-admin-change", refresh); window.removeEventListener("focus", refresh); };
  }, [loadCompany]);
  const setSelectedCompanyId = useCallback((companyId) => {
    const value = String(companyId || "");
    setSelectedCompanyIdState(value);
    window.localStorage.setItem(SELECTED_COMPANY_KEY, value);
  }, []);
  const value = useMemo(() => ({ catalog, company, companies, selectedCompanyId: String(company?.id || selectedCompanyId), setSelectedCompanyId }), [catalog,company,companies,selectedCompanyId,setSelectedCompanyId]);

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
