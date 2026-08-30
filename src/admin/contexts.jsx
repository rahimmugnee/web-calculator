import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { get, post } from "./api";

const AuthContext = createContext(null);
const CompanyContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    try { const data = await get("/auth/me"); setUser(data.user); }
    catch { setUser(null); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);
  const login = useCallback(async (credentials) => { const data = await post("/auth/login", credentials); setUser(data.user); return data.user; }, []);
  const logout = useCallback(async () => { try { await post("/auth/logout", {}); } finally { setUser(null); } }, []);
  const value = useMemo(() => ({ user, loading, login, logout, refresh }), [user, loading, login, logout, refresh]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() { return useContext(AuthContext); }

export function CompanyProvider({ children }) {
  const [companies, setCompanies] = useState([]);
  const [companyId, setCompanyIdState] = useState(() => window.sessionStorage.getItem("calculatorAdminCompany") || "");
  const refreshCompanies = useCallback(async () => {
    const rows = await get("/admin/companies"); setCompanies(rows);
    setCompanyIdState((current) => current && rows.some((company) => String(company.id) === String(current)) ? current : String(rows.find((company) => company.is_default)?.id || rows[0]?.id || ""));
  }, []);
  useEffect(() => { refreshCompanies().catch(() => {}); }, [refreshCompanies]);
  const setCompanyId = useCallback((value) => { const next = String(value); window.sessionStorage.setItem("calculatorAdminCompany", next); setCompanyIdState(next); }, []);
  const company = companies.find((item) => String(item.id) === String(companyId)) || null;
  const value = useMemo(() => ({ companies, companyId, company, setCompanyId, refreshCompanies }), [companies, companyId, company, setCompanyId, refreshCompanies]);
  return <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>;
}

export function useCompany() { return useContext(CompanyContext); }
