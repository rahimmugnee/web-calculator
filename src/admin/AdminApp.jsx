import { useEffect, useState } from "react";
import AdminLayout from "./AdminLayout";
import { AuthProvider, CompanyProvider, useAuth } from "./contexts";
import { navigate, routePath } from "./router";
import DashboardPage from "./pages/DashboardPage";
import CategoriesPage from "./pages/CategoriesPage";
import { BulkPricesPage, CompanyPricesPage, PricingTiersPage } from "./pages/PricingPages";
import { ActivityLogsPage, CustomersPage, DocumentsPage, SettingsPage, UsersPage } from "./pages/ManagementPages";
import CompanyBrandingPage from "./pages/CompanyBrandingPage";
import QuotationHistoryPage from "./pages/QuotationHistoryPage";
import RecycleBinPage from "./pages/RecycleBinPage";
import "./admin.css";

function LoginPage(){const {user,login}=useAuth();const [show,setShow]=useState(false),[loading,setLoading]=useState(false),[error,setError]=useState("");useEffect(()=>{if(user)navigate("/admin/dashboard");},[user]);const submit=async(event)=>{event.preventDefault();setLoading(true);setError("");const f=new FormData(event.currentTarget);try{await login({username:f.get("username"),password:f.get("password"),remember:f.get("remember")==="on"});navigate("/admin/dashboard");}catch(e){setError(e.message);}finally{setLoading(false);}};return <main className="admin-login-page"><section className="admin-login-card"><div className="admin-login-brand"><span>C</span><div><h1>Calculator</h1><p>Administration</p></div></div><div className="admin-login-heading"><h2>Welcome back</h2><p>Sign in to manage catalogs, pricing, and company settings.</p></div><form onSubmit={submit}><label>Username<input name="username" autoComplete="username" required autoFocus/></label><label>Password<div className="admin-password-field"><input name="password" type={show?"text":"password"} autoComplete="current-password" required/><button type="button" onClick={()=>setShow((value)=>!value)} aria-label={show?"Hide password":"Show password"}>{show?"Hide":"Show"}</button></div></label><label className="admin-check"><input name="remember" type="checkbox"/>Keep me signed in on this device</label>{error?<div className="admin-login-error" role="alert">{error}</div>:null}<button className="admin-button primary full login-submit" disabled={loading}>{loading?"Signing in…":"Login"}</button></form><p className="admin-login-security">Protected administrative access</p></section></main>}

function resolvePage(path){
  if(path==="/admin/dashboard")return <DashboardPage/>;
  if(path==="/admin/categories")return <CategoriesPage/>;
  if(["/admin/brands","/admin/products","/admin/accessories"].includes(path))return <CategoriesRedirect/>;
  if(path==="/admin/prices")return <CompanyPricesPage/>;
  if(path==="/admin/pricing-tiers")return <PricingTiersPage/>;
  if(path==="/admin/bulk-prices")return <BulkPricesPage/>;
  if(path.startsWith("/admin/calculators/"))return <SettingsPage type={`calculator-${path.split("/").pop()}`}/>;
  if(path==="/admin/quotations")return <QuotationHistoryPage/>;
  if(path==="/admin/invoices")return <DocumentsPage type="invoices"/>;
  if(path==="/admin/customers")return <CustomersPage/>;
  if(path==="/admin/companies")return <CompanyBrandingPage/>;
  if(path==="/admin/templates/quotation")return <SettingsPage type="quotation"/>;
  if(path==="/admin/templates/invoice")return <SettingsPage type="invoice"/>;
  if(path==="/admin/templates/terms")return <SettingsPage type="terms"/>;
  if(path==="/admin/recycle-bin")return <RecycleBinPage/>;
  if(path==="/admin/users")return <UsersPage/>;
  if(path==="/admin/activity-logs")return <ActivityLogsPage/>;
  if(path==="/admin/settings")return <SettingsPage/>;
  return <DashboardPage/>;
}

function CategoriesRedirect(){useEffect(()=>navigate("/admin/categories"),[]);return <CategoriesPage/>;}

function ProtectedAdmin({path}){const {user,loading}=useAuth();useEffect(()=>{if(!loading&&!user)navigate("/admin/login");},[loading,user]);if(loading)return <div className="admin-loading">Loading Calculator admin…</div>;if(!user)return null;return <CompanyProvider><AdminLayout path={path}>{resolvePage(path)}</AdminLayout></CompanyProvider>}

function AdminRouter(){const [path,setPath]=useState(routePath());useEffect(()=>{const handler=()=>setPath(routePath());window.addEventListener("popstate",handler);return()=>window.removeEventListener("popstate",handler);},[]);return path==="/admin/login"?<LoginPage/>:<ProtectedAdmin path={path}/>}
export default function AdminApp(){return <AuthProvider><AdminRouter/></AuthProvider>}
