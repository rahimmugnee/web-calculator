import { useEffect, useState } from "react";
import { useAuth, useCompany } from "./contexts";
import { navigate } from "./router";

const sections = [
  [null, [["Dashboard", "/admin/dashboard", "◦"]]],
  ["CATALOG", [["Categories", "/admin/categories", "⌘"]]],
  ["PRICING", [["Company Prices", "/admin/prices", "৳"], ["Pricing Tiers", "/admin/pricing-tiers", "≡"], ["Bulk Price Update", "/admin/bulk-prices", "%"]]],
  ["SALES", [["Quotations", "/admin/quotations", "Q"], ["Customers", "/admin/customers", "U"]]],
  ["COMPANY MANAGEMENT", [["Companies", "/admin/companies", "O"]]],
  ["TEMPLATES", [["Terms & Conditions", "/admin/templates/terms", "T"], ["Recycle Bin", "/admin/recycle-bin", "♻"]]],
  ["SYSTEM", [["Users & Roles", "/admin/users", "U"], ["Activity Logs", "/admin/activity-logs", "≋"], ["Settings", "/admin/settings", "⚙"]]],
];

export default function AdminLayout({ path, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quotationNotifications, setQuotationNotifications] = useState(0);
  const { user, logout } = useAuth();
  const { companies, companyId, setCompanyId } = useCompany();
  const go = (event, target) => { event.preventDefault(); navigate(target); };
  const signOut = async () => { await logout(); navigate("/admin/login"); };
  const readNotificationCount = () => { try { return JSON.parse(window.localStorage.getItem("quotationUnreadNotifications") || "[]").length; } catch { return 0; } };
  const clearQuotationNotifications = () => { try { window.localStorage.removeItem("quotationUnreadNotifications"); } catch {} setQuotationNotifications(0); };
  useEffect(() => {
    if (path === "/admin/quotations") clearQuotationNotifications(); else setQuotationNotifications(readNotificationCount());
    const refresh = () => path === "/admin/quotations" ? clearQuotationNotifications() : setQuotationNotifications(readNotificationCount());
    let channel;
    try { channel = new BroadcastChannel("quotation-history-live"); channel.addEventListener("message", refresh); } catch {}
    const storage = (event) => { if (event.key === "quotationUnreadNotifications") refresh(); };
    window.addEventListener("storage", storage);
    return () => { channel?.close(); window.removeEventListener("storage", storage); };
  }, [path]);
  return <div className={`admin-shell${collapsed ? " sidebar-collapsed" : ""}`}>
    <aside className="admin-sidebar">
      <div className="admin-brand"><span className="admin-brand-mark">C</span><span className="admin-brand-text">Calculator</span></div>
      <nav aria-label="Admin navigation">
        {sections.filter(([label]) => label !== "PRICING").map(([label, links], index) => <div className="admin-nav-section" key={label || index}>
          {label ? <div className="admin-nav-label">{label}</div> : null}
          {links.map(([name, target, icon]) => <a key={target} href={target} title={collapsed ? name : undefined} className={path === target || (target !== "/admin/dashboard" && path.startsWith(`${target}/`)) ? "active" : ""} onClick={(event) => go(event, target)}><span className="admin-nav-icon" aria-hidden="true">{icon}</span><span className="admin-nav-text">{name}</span></a>)}
        </div>)}
      </nav>
    </aside>
    <div className="admin-main">
      <header className="admin-topbar">
        <button type="button" className="admin-icon-button" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}>☰</button>
        <label className="admin-company-select"><select aria-label="Company" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <div className="admin-topbar-spacer" />
        <a className="admin-button secondary" href="/">Open Calculator</a>
        <button className="admin-icon-button admin-notification-button" type="button" title="Quotation notifications" aria-label={`${quotationNotifications} unread quotation notifications`} onClick={() => { clearQuotationNotifications(); navigate("/admin/quotations"); }}>🔔{quotationNotifications > 0 ? <span className="admin-notification-badge">{quotationNotifications > 99 ? "99+" : quotationNotifications}</span> : null}</button>
        <div className="admin-profile">
          <button type="button" className="admin-profile-button" onClick={() => setProfileOpen((value) => !value)}><span className="admin-avatar">{user?.display_name?.[0] || "A"}</span><span><b>{user?.display_name}</b><small>{user?.role_name}</small></span><span>⌄</span></button>
          {profileOpen ? <div className="admin-profile-menu"><div><b>{user?.username}</b><small>{user?.role_name}</small></div><button type="button" onClick={signOut}>Logout</button></div> : null}
        </div>
      </header>
      <main className="admin-content">{children}</main>
    </div>
  </div>;
}

export function PageHeader({ eyebrow, title, description, actions }) {
  return <div className="admin-page-header"><div><div className="admin-eyebrow">{eyebrow}</div><h1>{title}</h1>{description ? <p>{description}</p> : null}</div>{actions ? <div className="admin-page-actions">{actions}</div> : null}</div>;
}

export function StatusBadge({ active = true, children }) { return <span className={`admin-status ${active ? "active" : "inactive"}`}>{children || (active ? "Active" : "Inactive")}</span>; }
export function EmptyState({ title = "Nothing here yet", description = "Create the first record to get started." }) { return <div className="admin-empty"><div className="admin-empty-icon">□</div><h3>{title}</h3><p>{description}</p></div>; }
export function Notice({ message, type = "success", onClose }) { return message ? <div className={`admin-notice ${type}`} role="status"><span>{message}</span>{onClose ? <button onClick={onClose} aria-label="Dismiss" type="button">×</button> : null}</div> : null; }
