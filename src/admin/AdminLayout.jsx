import { useEffect, useRef, useState } from "react";
import { useAuth, useCompany } from "./contexts";
import { navigate } from "./router";
import { isPrivilegedAdmin } from "./access";

const sections = [
  ["CATALOG", [["Dashboard", "/admin/dashboard", "dashboard"], ["Categories", "/admin/categories", "categories"]]],
  ["SALES", [["Quotations", "/admin/quotations", "quotations"], ["Customers", "/admin/customers", "customer"]]],
  ["COMPANY MANAGEMENT", [["Companies", "/admin/companies", "company", true]]],
  ["TEMPLATES", [["Terms & Conditions", "/admin/templates/terms", "terms"], ["Recycle Bin", "/admin/recycle-bin", "trash"]]],
  ["SYSTEM", [["Users & Roles", "/admin/users", "users", true], ["Activity Logs", "/admin/activity-logs", "activity"], ["Settings", "/admin/settings", "settings"]]],
];

function SidebarIcon({ name }) {
  const paths = {
    dashboard: <><path d="M3 10.5 12 3l9 7.5"/><path d="M5.5 9.5V21h13V9.5M9 21v-7h6v7"/></>,
    categories: <><rect x="3" y="3" width="6" height="6" rx="1"/><rect x="15" y="3" width="6" height="6" rx="1"/><rect x="3" y="15" width="6" height="6" rx="1"/><rect x="15" y="15" width="6" height="6" rx="1"/></>,
    quotations: <><path d="M6 2.5h8l4 4V21H6z"/><path d="M14 2.5v4h4M9 11h6M9 15h6"/></>,
    customer: <><circle cx="12" cy="8" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2z"/></>,
    company: <><path d="M4 21V5h10v16M14 10h6v11M8 9h2M8 13h2M8 17h2M17 14h1M17 18h1"/></>,
    terms: <><path d="M6 2.5h12v19H6z"/><path d="M9 7h6M9 11h6M9 15h3M14 17l1.3 1.3L18 15.5"/></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8zM6 7l1 14h10l1-14M10 11v6M14 11v6"/></>,
    users: <><circle cx="9" cy="8" r="3"/><path d="M3 20v-1a6 6 0 0 1 12 0v1M16 5.5a3 3 0 0 1 0 5.8M17 14a5 5 0 0 1 4 4.9V20"/></>,
    activity: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l-3.5 2M3 8H.5M3 16H1"/></>,
    settings: <><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1z"/></>,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

function ChevronIcon({ collapsed = false }) {
  return <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{collapsed ? <path d="m9 6 6 6-6 6"/> : <><path d="m14 7-5 5 5 5"/><path d="m19 7-5 5 5 5"/></>}</svg>;
}

export default function AdminLayout({ path, children }) {
  const [collapsed, setCollapsed] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [quotationNotifications, setQuotationNotifications] = useState(0);
  const profileRef = useRef(null);
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

  useEffect(() => {
    if (!profileOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  const displayName = user?.display_name || "Admin User";
  const roleName = user?.role_name || "Administrator";
  const canAccessPrivilegedAdmin = isPrivilegedAdmin(user);
  const visibleSections = sections
    .map(([label, links]) => [label, links.filter(([, , , privileged]) => !privileged || canAccessPrivilegedAdmin)])
    .filter(([, links]) => links.length);

  return <div className={`admin-shell${collapsed ? " sidebar-collapsed" : ""}`}>
    <aside className="admin-sidebar">
      <div className="admin-brand">
        <span className="admin-brand-mark">C</span>
        <span className="admin-brand-text"><b>Calculator</b><small>Quotation Management</small></span>
        <button type="button" className="admin-sidebar-collapse" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} onClick={() => setCollapsed((value) => !value)}><ChevronIcon collapsed={collapsed}/></button>
      </div>

      <nav className="admin-sidebar-nav" aria-label="Admin navigation">
        {visibleSections.map(([label, links]) => <div className="admin-nav-section" key={label}>
          <div className="admin-nav-label">{label}</div>
          {links.map(([name, target, icon]) => <a key={target} href={target} title={collapsed ? name : undefined} className={path === target || (target !== "/admin/dashboard" && path.startsWith(`${target}/`)) ? "active" : ""} onClick={(event) => go(event, target)}>
            <span className="admin-nav-icon"><SidebarIcon name={icon}/></span><span className="admin-nav-text">{name}</span>
          </a>)}
        </div>)}
      </nav>

      <div className="admin-sidebar-footer" ref={profileRef}>
        {profileOpen ? <div className="admin-sidebar-profile-menu"><div><b>{user?.email}</b><small>{roleName}</small></div><button type="button" onClick={signOut}>Logout</button></div> : null}
        <div className="admin-sidebar-user-card">
          <button type="button" className="admin-sidebar-user" aria-label={`${displayName}, ${roleName}`} onClick={() => setProfileOpen((value) => !value)}>
            <span className="admin-avatar">{displayName[0]}</span>
            <span className="admin-sidebar-user-copy"><b>{displayName}</b><small>{roleName}</small></span>
            <span className="admin-sidebar-user-chevron" aria-hidden="true">⌄</span>
          </button>
          <a className="admin-sidebar-settings" href="/admin/settings" title="Settings" aria-label="Open settings" onClick={(event) => go(event, "/admin/settings")}><SidebarIcon name="settings"/></a>
        </div>
      </div>
    </aside>

    <div className="admin-main">
      <header className="admin-topbar">
        <label className="admin-company-select"><select aria-label="Company" value={companyId} onChange={(event) => setCompanyId(event.target.value)}>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></label>
        <div className="admin-topbar-spacer" />
        <a className="admin-button secondary" href="/">Open Calculator</a>
        <button className="admin-icon-button admin-notification-button" type="button" title="Quotation notifications" aria-label={`${quotationNotifications} unread quotation notifications`} onClick={() => { clearQuotationNotifications(); navigate("/admin/quotations"); }}>🔔{quotationNotifications > 0 ? <span className="admin-notification-badge">{quotationNotifications > 99 ? "99+" : quotationNotifications}</span> : null}</button>
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
