import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { defaultQuotationCatalog } from "../data/defaultQuotationCatalog.js";
import { loadQuotationCatalog } from "../lib/loadQuotationCatalog.js";

const CatalogContext = createContext(null);

export function CatalogProvider({ children }) {
  const [catalog, setCatalog] = useState(defaultQuotationCatalog);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fromRemote, setFromRemote] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { catalog: next, fromRemote: remote } = await loadQuotationCatalog();
      setCatalog(next);
      setFromRemote(remote);
    } catch (e) {
      setError(e?.message || "Failed to load catalog");
      setCatalog(defaultQuotationCatalog);
      setFromRemote(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const value = useMemo(
    () => ({ catalog, loading, error, fromRemote, reload }),
    [catalog, loading, error, fromRemote, reload]
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
