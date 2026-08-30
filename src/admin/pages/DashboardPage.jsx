import { useEffect, useState } from "react";
import { get } from "../api";
import { PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";

export default function DashboardPage() {
  const { companyId, company } = useCompany();
  const [stats, setStats] = useState({});
  useEffect(() => { if (companyId) get(`/admin/dashboard?companyId=${companyId}`).then(setStats).catch(() => setStats({})); }, [companyId]);
  const cards = [["Shared Products", stats.products || 0, "One catalog across all companies"],["Quotations",stats.quotations||0,company?.name],["Invoices",stats.invoices||0,company?.name],["Customers",stats.customers||0,company?.name]];
  return <><PageHeader eyebrow="Overview" title="Dashboard" description={`Company-aware administration for ${company?.name || "Calculator"}.`} />
    <div className="admin-stat-grid">{cards.map(([label,value,note])=><div className="admin-stat-card" key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></div>)}</div>
    <div className="admin-grid-two"><section className="admin-panel"><div className="admin-panel-heading"><div><h2>System architecture</h2><p>Shared engine, company-specific configuration</p></div></div><div className="admin-flow"><span>Admin UI</span><b>→</b><span>Authenticated API</span><b>→</b><span>Repositories</span><b>→</b><span>PostgreSQL</span></div></section>
    <section className="admin-panel"><div className="admin-panel-heading"><div><h2>Current company</h2><p>Selected throughout management pages</p></div></div><dl className="admin-detail-list"><div><dt>Name</dt><dd>{company?.name || "—"}</dd></div><div><dt>Code</dt><dd>{company?.code || "—"}</dd></div><div><dt>Currency</dt><dd>{company?.currency || "BDT"}</dd></div><div><dt>Default</dt><dd>{company?.is_default ? "Yes" : "No"}</dd></div></dl></section></div></>;
}
