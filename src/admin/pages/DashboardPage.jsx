import { useEffect, useMemo, useState } from "react";
import { get } from "../api";
import { PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";

const number = (value) => Number(value || 0);
const money = (value) => `৳${number(value).toLocaleString("en-US")}`;
const shortDate = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "—";
const organization = (row) => row.client_information?.company || row.client_information?.organization || "—";
const monthKey = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const STATUS_GROUPS = [
  { key: "final", label: "Final", color: "#35bd7b" },
  { key: "draft", label: "Draft", color: "#2f80ed" },
  { key: "approved", label: "Approved", color: "#7a52cf" },
  { key: "other", label: "Other", color: "#98a2b3" },
];

const CALCULATORS = [
  { key: "fixed", label: "LED Display", color: "#2f80ed" },
  { key: "rental", label: "Rental LED Display", color: "#7a52cf" },
  { key: "pa", label: "PA System", color: "#f5a000" },
  { key: "conference", label: "Conference System", color: "#17a673" },
  { key: "other", label: "Others", color: "#98a2b3" },
];

export default function DashboardPage() {
  const { companyId, company } = useCompany();
  const [selectedMonth, setSelectedMonth] = useState(() => monthKey());
  const [data, setData] = useState({});
  const [loading, setLoading] = useState(false);
  const [showOrganizations, setShowOrganizations] = useState(false);
  const [organizationLoading, setOrganizationLoading] = useState(false);

  useEffect(() => {
    if (!companyId) return undefined;
    let active = true;
    setLoading(true);
    get(`/admin/dashboard?companyId=${companyId}&month=${selectedMonth}`).then((response) => {
      if (active) setData(response || {});
    }).catch(() => {
      if (active) setData({});
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => { active = false; };
  }, [companyId, selectedMonth]);

  useEffect(() => {
    if (!showOrganizations || !companyId || Array.isArray(data.organization_list)) return undefined;
    let active = true;
    setOrganizationLoading(true);
    get(`/admin/dashboard?companyId=${companyId}&month=${selectedMonth}`).then((response) => {
      if (active) setData(response || {});
    }).catch(() => {
      // Keep the organization names derived from the visible quotation rows.
    }).finally(() => {
      if (active) setOrganizationLoading(false);
    });
    return () => { active = false; };
  }, [companyId, data.organization_list, selectedMonth, showOrganizations]);

  const dashboard = useMemo(() => dashboardMetrics(data), [data]);
  const dateRange = monthRangeLabel(selectedMonth);
  const previousRange = monthRangeLabel(previousMonthKey(selectedMonth));
  const months = useMemo(() => availableMonths(data.months, selectedMonth), [data.months, selectedMonth]);

  const cards = [
    { label: "Total Quotations", value: dashboard.total, note: dateRange.short, growth: dashboard.quotationGrowth, tone: "blue", icon: "Q" },
    { label: "Previous Month", value: dashboard.previousTotal, note: previousRange.short, growth: null, tone: "green", icon: "▣" },
    { label: "Quoted Value (BDT)", value: money(dashboard.quotedValue), note: dateRange.monthName, growth: dashboard.valueGrowth, tone: "amber", icon: "৳" },
    { label: "Organizations", value: dashboard.organizations, note: "View Organizations", growth: dashboard.organizationGrowth, tone: "violet", icon: "O", onNoteClick: () => setShowOrganizations(true) },
  ];

  const monthSelector = <label className={`dashboard-date-range${loading ? " loading" : ""}`}>
    <svg className="dashboard-date-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" /></svg>
    <select aria-label="Filter dashboard by month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} disabled={loading}>{months.map((item) => <option key={item.month} value={item.month}>{item.label}{item.quotations !== null ? ` · ${item.quotations} quotations` : ""}</option>)}</select>
    <svg className="dashboard-date-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
  </label>;

  return <div className={`dashboard-page${loading ? " is-loading" : ""}`}>
    <PageHeader eyebrow="Overview" title="Dashboard" description={`Overview of quotations and sales activities for ${company?.name || "Calculator"}.`} actions={monthSelector} />

    <section className="dashboard-overview-grid" aria-label={`Quotation overview for ${dateRange.monthName}`}>
      {cards.map((card) => <article className="dashboard-metric-card" key={card.label}>
        <div className={`dashboard-metric-icon ${card.tone}`} aria-hidden="true">{card.icon}</div>
        <div className="dashboard-metric-content"><span>{card.label}</span><strong>{card.value}</strong><div>{card.onNoteClick ? <button className="dashboard-metric-link" type="button" onClick={card.onNoteClick}>{card.note}<span aria-hidden="true">→</span></button> : <small>{card.note}</small>}{card.growth === null ? <span className="dashboard-growth neutral">Previous period</span> : <GrowthBadge value={card.growth} />}</div></div>
      </article>)}
    </section>

    {showOrganizations ? <OrganizationModal month={dateRange.monthName} organizations={dashboard.organizationList} loading={organizationLoading} onClose={() => setShowOrganizations(false)} /> : null}

    <div className="dashboard-main-grid">
      <DashboardPanel className="dashboard-recent-panel" title={`Quotations · ${dateRange.monthName}`} action={<a href="/admin/quotations">View All</a>}>
        <div className="dashboard-table-scroll"><table className="dashboard-recent-table"><thead><tr><th>Ref No.</th><th>Date</th><th>Client</th><th>Organization</th><th>Amount (BDT)</th><th>Created By</th><th>Status</th></tr></thead><tbody>{dashboard.recent.map((row) => <tr key={row.id}><td><b>{row.quotation_number}</b></td><td>{shortDate(row.created_at)}</td><td>{row.client_name || "—"}</td><td>{organization(row)}</td><td><b>{money(row.grand_total)}</b></td><td>{row.created_by_name || row.created_by || "Calculator"}</td><td><span className={`dashboard-status ${statusClass(row.status)}`}>{row.status}</span></td></tr>)}</tbody></table></div>
        {!dashboard.recent.length ? <div className="dashboard-empty-row">No quotations found for {dateRange.monthName}.</div> : null}
        <div className="dashboard-table-footer">{dashboard.recent.length ? `Showing 1 to ${dashboard.recent.length} of ${dashboard.total} quotations for ${dateRange.monthName}` : ""}</div>
      </DashboardPanel>

      <DashboardPanel className="dashboard-status-panel" title={`Quotation Status · ${dateRange.monthName}`}>
        <div className="dashboard-status-content"><div className="dashboard-donut" style={{ background: dashboard.donut }}><div><strong>{dashboard.total}</strong><span>Total</span></div></div><div className="dashboard-status-legend">{dashboard.statusGroups.map((item) => <div key={item.key}><span className="dashboard-legend-dot" style={{ background: item.color }} /><b>{item.label}</b><span>{item.count} ({item.percentage}%)</span></div>)}</div></div>
        <a className="dashboard-panel-wide-link" href="/admin/quotations">View All Quotations</a>
      </DashboardPanel>
    </div>

    <div className="dashboard-bottom-grid">
      <DashboardPanel title="Quotations by Calculator" action={<span className="dashboard-panel-filter">{dateRange.monthName}</span>}>
        <div className="dashboard-calculator-list">{dashboard.calculators.map((item) => <div className="dashboard-calculator-row" key={item.key}><span>{item.label}</span><div><i style={{ width: `${item.width}%`, background: item.color }} /></div><b>{item.count}</b></div>)}</div>
        <a className="dashboard-panel-wide-link dashboard-category-link" href="/admin/categories">View All Categories<span aria-hidden="true">→</span></a>
      </DashboardPanel>

      <DashboardPanel title="Quick Actions">
        <div className="dashboard-quick-grid">
          <QuickAction href="/" tone="blue" icon="▦" title="Open Calculator" description="Create new quotation" />
          <QuickAction href="/admin/quotations" tone="green" icon="▤" title="View Quotations" description="Browse all quotations" />
          <QuickAction href="/admin/customers" tone="violet" icon="+" title="Add Customer" description="Manage customers" />
          <QuickAction href="/admin/categories" tone="amber" icon="◆" title="Manage Products" description="Manage products & models" />
          <QuickAction href="/admin/companies" tone="blue" icon="▥" title="Manage Companies" description="Company & branding" />
          <QuickAction href="/admin/templates/terms" tone="pink" icon="T" title="Terms & Conditions" description="Manage terms templates" />
        </div>
      </DashboardPanel>
    </div>

  </div>;
}

function DashboardPanel({ title, action, className = "", children }) {
  return <section className={`dashboard-panel ${className}`}><header><h2>{title}</h2>{action || null}</header>{children}</section>;
}

function GrowthBadge({ value }) {
  const positive = value >= 0;
  return <span className={`dashboard-growth ${positive ? "positive" : "negative"}`}>{positive ? "↑" : "↓"} {Math.abs(value)}%</span>;
}

function QuickAction({ href, tone, icon, title, description }) {
  return <a className="dashboard-quick-action" href={href}><span className={`dashboard-quick-icon ${tone}`} aria-hidden="true">{icon}</span><span><b>{title}</b><small>{description}</small></span><i aria-hidden="true">›</i></a>;
}

function OrganizationModal({ month, organizations, loading, onClose }) {
  return <div className="admin-modal-backdrop dashboard-organization-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <section className="admin-modal dashboard-organization-modal" role="dialog" aria-modal="true" aria-labelledby="dashboard-organizations-title">
      <header className="admin-modal-head"><div><h2 id="dashboard-organizations-title">Organizations · {month}</h2><p>{organizations.length} organizations with quotations in this month</p></div><button type="button" aria-label="Close organizations" onClick={onClose}>×</button></header>
      {organizations.length ? <div className="dashboard-organization-table-wrap"><table className="dashboard-organization-table"><thead><tr><th>Organization</th><th>Quotations</th><th>Quoted Value</th></tr></thead><tbody>{organizations.map((item) => <tr key={item.organization_name}><td>{item.organization_name}</td><td>{number(item.quotations)}</td><td>{money(item.quoted_value)}</td></tr>)}</tbody></table></div> : <div className="dashboard-organization-empty">{loading ? "Loading organizations…" : `No organizations found for ${month}.`}</div>}
    </section>
  </div>;
}

function dashboardMetrics(data) {
  const selected = data.monthly || {};
  const previous = data.previous_month || {};
  const total = number(selected.quotations);
  const quotedValue = number(selected.quoted_value);
  const organizations = number(selected.organizations);
  const rawStatuses = Array.isArray(data.statuses) ? data.statuses : [];
  const counts = rawStatuses.reduce((result, item) => {
    const key = ["final", "draft", "approved"].includes(item.status) ? item.status : "other";
    result[key] = (result[key] || 0) + number(item.count);
    return result;
  }, {});
  const statusGroups = STATUS_GROUPS.map((item) => ({ ...item, count: counts[item.key] || 0, percentage: total ? Number((((counts[item.key] || 0) / total) * 100).toFixed(1)) : 0 }));
  let cursor = 0;
  const gradient = statusGroups.filter((item) => item.count).map((item) => { const start = cursor; cursor += (item.count / Math.max(total, 1)) * 100; return `${item.color} ${start}% ${cursor}%`; });
  if (cursor < 100) gradient.push(`#e8edf4 ${cursor}% 100%`);

  const rawCalculators = Array.isArray(data.calculators) ? data.calculators : [];
  const calculatorCounts = rawCalculators.reduce((result, item) => {
    const type = String(item.calculator_type || "fixed").toLowerCase();
    const key = type.includes("rental") ? "rental" : type.includes("conference") ? "conference" : type === "pa" || type.includes("pa-") ? "pa" : type === "fixed" || type.includes("led") ? "fixed" : "other";
    result[key] = (result[key] || 0) + number(item.count);
    return result;
  }, {});
  const maxCalculator = Math.max(1, ...Object.values(calculatorCounts));

  const recent = Array.isArray(data.recent) ? data.recent : [];
  return {
    total,
    previousTotal: number(previous.quotations),
    quotedValue,
    organizations,
    quotationGrowth: growth(total, number(previous.quotations)),
    valueGrowth: growth(quotedValue, number(previous.quoted_value)),
    organizationGrowth: growth(organizations, number(previous.organizations)),
    recent,
    organizationList: Array.isArray(data.organization_list) ? data.organization_list : organizationsFromRows(recent),
    statusGroups,
    donut: `conic-gradient(${gradient.join(",")})`,
    calculators: CALCULATORS.map((item) => ({ ...item, count: calculatorCounts[item.key] || 0, width: ((calculatorCounts[item.key] || 0) / maxCalculator) * 100 })),
  };
}

function organizationsFromRows(rows) {
  const grouped = new Map();
  rows.forEach((row) => {
    const name = organization(row);
    if (!name || name === "—") return;
    const current = grouped.get(name) || { organization_name: name, quotations: 0, quoted_value: 0 };
    current.quotations += 1;
    current.quoted_value += number(row.grand_total);
    grouped.set(name, current);
  });
  return [...grouped.values()].sort((a, b) => b.quoted_value - a.quoted_value || a.organization_name.localeCompare(b.organization_name));
}

function availableMonths(rows, selectedMonth) {
  const byMonth = new Map((Array.isArray(rows) ? rows : []).map((item) => [item.month, number(item.quotations)]));
  if (!byMonth.has(selectedMonth)) byMonth.set(selectedMonth, null);
  return [...byMonth.entries()].sort(([a], [b]) => b.localeCompare(a)).map(([month, quotations]) => ({ month, quotations, label: monthRangeLabel(month).monthName }));
}

function growth(current, previous) {
  if (!previous) return current ? 100 : 0;
  return Math.round(((current - previous) / previous) * 100);
}

function statusClass(status) {
  return ["final", "draft", "approved", "sent", "rejected", "expired"].includes(status) ? status : "other";
}

function previousMonthKey(value) {
  const [year, month] = value.split("-").map(Number);
  return monthKey(new Date(year, month - 2, 1));
}

function monthRangeLabel(value) {
  const [year, month] = value.split("-").map(Number);
  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0);
  const shortMonth = start.toLocaleDateString("en-US", { month: "short" });
  const monthName = start.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  return { monthName, long: `${shortMonth} 1, ${year} – ${shortMonth} ${end.getDate()}, ${year}`, short: `${shortMonth} 1 – ${shortMonth} ${end.getDate()}, ${year}` };
}
