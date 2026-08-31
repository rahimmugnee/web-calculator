import { useCallback, useEffect, useMemo, useState } from "react";
import { get, patch, post, put } from "../api";
import { EmptyState, Notice, PageHeader, StatusBadge } from "../AdminLayout";
import { useCompany } from "../contexts";

const fileAsDataUrl = (file) => new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve({ name:file.name, data:reader.result }); reader.onerror = reject; reader.readAsDataURL(file); });

export function CompaniesPage(){const {companies,refreshCompanies}=useCompany();const [editing,setEditing]=useState(null),[notice,setNotice]=useState("");const save=async(event)=>{event.preventDefault();const f=new FormData(event.currentTarget),body=Object.fromEntries(f);body.is_active=true;body.is_default=editing.is_default;body.assets={};for(const type of ["logo","site_logo","invoice_pad","seal","signature"]){const file=f.get(type);if(file?.size)body.assets[type]=await fileAsDataUrl(file);}await put(`/admin/companies/${editing.id}`,body);setEditing(null);setNotice("Company branding updated.");refreshCompanies();};return <><PageHeader eyebrow="Companies" title="Companies" description="Company branding, assets, and authorized signatory details."/><Notice message={notice}/><div className="admin-card-grid">{companies.map((company)=><article className="company-card admin-panel" key={company.id}><div><span className="company-monogram">{company.name[0]}</span><StatusBadge active={company.is_active}/></div><h2>{company.name}</h2><p>{company.code}</p><dl><div><dt>Signatory</dt><dd>{company.signatory_name||"Not set"}</dd></div><div><dt>Designation</dt><dd>{company.signatory_designation||"Not set"}</dd></div><div><dt>Assets</dt><dd>{Object.keys(company.assets||{}).length}/5</dd></div></dl>{company.is_default?<span className="admin-default-badge">Default company</span>:null}<button className="admin-button secondary full" type="button" onClick={()=>setEditing(company)}>Edit company</button></article>)}</div>{editing?<CompanyModal company={editing} onSave={save} onClose={()=>setEditing(null)}/>:null}</>}

function CompanyModal({company,onSave,onClose}){const assets=[["logo","Header / footer logo"],["site_logo","Site logo"],["invoice_pad","Quotation pad background"],["seal","Company seal"],["signature","Signature"]];return <div className="admin-modal-backdrop"><div className="admin-modal wide" role="dialog" aria-modal="true"><div className="admin-modal-head"><div><h2>Edit {company.name}</h2><p>Authorized Signatory & Company Assets</p></div><button type="button" onClick={onClose}>×</button></div><form onSubmit={onSave}><h3>Authorized Signatory</h3><div className="admin-form-grid"><label>Name<input name="signatory_name" required defaultValue={company.signatory_name||""}/></label><label>Designation<input name="signatory_designation" required defaultValue={company.signatory_designation||""}/></label><label>Company name<input name="signatory_company_name" required defaultValue={company.signatory_company_name||company.name}/></label><label>Phone number<input name="signatory_phone" required defaultValue={company.signatory_phone||""}/></label><label>Email<input name="signatory_email" type="email" required defaultValue={company.signatory_email||""}/></label></div><h3>Company Assets</h3><div className="admin-form-grid">{assets.map(([name,label])=><label key={name}>{label}<input name={name} type="file" accept="image/png,image/jpeg,image/webp"/><small>{company.assets?.[name]?`Current: ${company.assets[name]}`:"No file uploaded"}</small></label>)}</div><input type="hidden" name="name" value={company.name}/><input type="hidden" name="code" value={company.code}/><div className="admin-modal-actions"><button className="admin-button secondary" type="button" onClick={onClose}>Cancel</button><button className="admin-button primary">Save Company</button></div></form></div></div>}

export function DocumentsPage({type}){const {companyId}=useCompany();const [rows,setRows]=useState([]),[notice,setNotice]=useState("");const load=useCallback(()=>companyId?get(`/admin/${type}?companyId=${companyId}&limit=100`).then(setRows):Promise.resolve(),[companyId,type]);useEffect(()=>{load().catch((e)=>setNotice(e.message));},[load]);const isQuote=type==="quotations";const changeStatus=async(row,status)=>{await patch(`/admin/${type}/${row.id}/status`,{status});setNotice("Status updated.");load();};return <><PageHeader eyebrow="Sales" title={isQuote?"Quotations":"Invoices"} description="Historical amounts and line-item snapshots remain unchanged when catalog prices change."/><Notice message={notice}/><div className="admin-table-wrap admin-panel">{rows.length?<table className="admin-table"><thead><tr><th>SL No.</th><th>{isQuote?"Quotation No":"Invoice No"}</th><th>Company</th><th>Client</th>{isQuote?<th>Calculator Type</th>:<th>Quotation Reference</th>}<th>Amount</th><th>Status</th><th>Date</th><th>Actions</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.id}><td>{index+1}</td><td><b>{row.quotation_number||row.invoice_number}</b></td><td>{row.company_name}</td><td>{row.client_name||"—"}</td><td>{row.calculator_type||row.quotation_id||"—"}</td><td>৳ {Number(row.grand_total).toLocaleString()}</td><td><StatusBadge active={!['rejected','expired','cancelled'].includes(row.status)}>{row.status}</StatusBadge></td><td>{new Date(row.created_at).toLocaleDateString()}</td><td><select aria-label="Change status" value={row.status} onChange={(e)=>changeStatus(row,e.target.value)}>{(isQuote?["draft","sent","approved","rejected","expired","converted-to-invoice"]:["draft","issued","paid","overdue","cancelled"]).map((s)=><option key={s}>{s}</option>)}</select></td></tr>)}</tbody></table>:<EmptyState title={`No ${type} yet`} description="Records created through the sales workflow will appear here."/>}</div></>}

export function CustomersPage() {
  const { companyId } = useCompany();
  const [rows, setRows] = useState([]);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [notice, setNotice] = useState("");
  const [draftSearch, setDraftSearch] = useState("");
  const [draftOrganization, setDraftOrganization] = useState("all");
  const [draftStatus, setDraftStatus] = useState("all");
  const [filters, setFilters] = useState({ search: "", organization: "all", status: "all" });
  const [page, setPage] = useState(1);
  const load = useCallback(() => companyId ? get(`/admin/customers?companyId=${companyId}&limit=100`).then(setRows) : Promise.resolve(), [companyId]);

  useEffect(() => {
    const refresh = () => load().catch((error) => setNotice(error.message));
    const refreshForChange = (event) => {
      const path = String(event?.detail?.path || "");
      if (!path || path.includes("customers") || path.includes("quotations")) refresh();
    };
    const refreshForStorage = (event) => { if (event.key === "calculatorLiveUpdate") refresh(); };
    refresh();
    window.addEventListener("focus", refresh);
    window.addEventListener("calculator-admin-change", refreshForChange);
    window.addEventListener("storage", refreshForStorage);
    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("calculator-admin-change", refreshForChange);
      window.removeEventListener("storage", refreshForStorage);
    };
  }, [load]);

  const organizations = useMemo(() => [...new Set(rows.map((row) => row.organization).filter(Boolean))].sort((a, b) => a.localeCompare(b)), [rows]);
  const filteredRows = useMemo(() => rows.filter((row) => {
    const haystack = [row.name, row.organization, row.designation, row.phone, row.email].filter(Boolean).join(" ").toLowerCase();
    return (!filters.search || haystack.includes(filters.search.toLowerCase()))
      && (filters.organization === "all" || row.organization === filters.organization)
      && (filters.status === "all" || (filters.status === "active") === row.is_active);
  }), [filters, rows]);
  const pageCount = Math.max(1, Math.ceil(filteredRows.length / 7));
  const pageRows = filteredRows.slice((page - 1) * 7, page * 7);
  const first = rows[0] || {};
  const metrics = [
    { label: "Total Customers", value: Number(first.total_count || rows.length), note: "All time customers", icon: "C", tone: "violet" },
    { label: "Total Quotations", value: Number(first.all_customer_quotations || 0), note: "From all customers", icon: "Q", tone: "green" },
    { label: "Total Quoted Value", value: customerMoney(first.all_customer_quoted_value), note: "From all customers", icon: "৳", tone: "amber" },
    { label: "Active Customers", value: Number(first.active_count || rows.filter((row) => row.is_active).length), note: "Currently active", icon: "A", tone: "blue" },
  ];

  const applyFilters = (event) => {
    event.preventDefault();
    setFilters({ search: draftSearch.trim(), organization: draftOrganization, status: draftStatus });
    setPage(1);
  };
  const resetFilters = () => {
    setDraftSearch(""); setDraftOrganization("all"); setDraftStatus("all");
    setFilters({ search: "", organization: "all", status: "all" }); setPage(1);
  };
  const save = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { ...Object.fromEntries(form), company_id: Number(companyId), is_active: form.get("is_active") === "on" };
    if (editing.id) await put(`/admin/customers/${editing.id}`, body); else await post("/admin/customers", body);
    setEditing(null); setNotice("Customer saved."); load();
  };

  return <div className="customers-page">
    <PageHeader eyebrow="Sales" title="Customers" description="Manage customer and organization information for future quotation selection." actions={<button className="customers-add-button" type="button" onClick={() => setEditing({ is_active: true })}><span>+</span>Add Customer</button>}/>
    <Notice message={notice} onClose={() => setNotice("")}/>

    <section className="customers-metric-grid" aria-label="Customer overview">{metrics.map((item) => <article className="customers-metric-card" key={item.label}><span className={`customers-metric-icon ${item.tone}`}>{item.icon}</span><div><span>{item.label}</span><strong>{item.value}</strong><small>{item.note}</small></div></article>)}</section>

    <form className="customers-toolbar" onSubmit={applyFilters}>
      <label className="customers-search"><span aria-hidden="true">⌕</span><input className="customers-search-input" aria-label="Search customers" value={draftSearch} onChange={(event) => setDraftSearch(event.target.value)} placeholder="Search by name, organization, email or phone..."/></label>
      <select aria-label="Filter by organization" value={draftOrganization} onChange={(event) => setDraftOrganization(event.target.value)}><option value="all">All Organizations</option>{organizations.map((name) => <option key={name} value={name}>{name}</option>)}</select>
      <select aria-label="Filter by status" value={draftStatus} onChange={(event) => setDraftStatus(event.target.value)}><option value="all">All Status</option><option value="active">Active</option><option value="inactive">Inactive</option></select>
      <span className="customers-toolbar-spacer"/>
      <button className="customers-filter-button" type="submit"><span aria-hidden="true">▼</span>Filters</button>
      <button className="customers-reset-button" type="button" onClick={resetFilters}><span aria-hidden="true">↶</span>Reset</button>
    </form>

    <section className="customers-table-panel">
      <div className="customers-table-scroll">{pageRows.length ? <table className="customers-table"><thead><tr><th>SL No.</th><th>Customer / Contact</th><th>Organization</th><th>Designation</th><th>Mobile</th><th>Email</th><th>Total Quotations</th><th>Last Quotation</th><th>Status</th><th>Actions</th></tr></thead><tbody>{pageRows.map((row, index) => <tr key={row.id}><td>{(page-1)*7+index+1}</td><td><div className="customers-contact"><span className={`customers-avatar tone-${index % 5}`}>{customerInitials(row.name)}</span><span><b>{row.name}</b><small>{row.phone || "No phone"}</small></span></div></td><td><span className="customers-organization"><i aria-hidden="true">▦</i>{row.organization || "—"}</span></td><td>{row.designation || "—"}</td><td>{row.phone || "—"}</td><td>{row.email || "—"}</td><td><b className="customers-quotation-count">{Number(row.total_quotations || 0)}</b></td><td>{row.last_quotation_at ? <span className="customers-last-quotation">{new Date(row.last_quotation_at).toLocaleDateString("en-GB")}<small>{row.last_quotation_number}</small></span> : "—"}</td><td><StatusBadge active={row.is_active}/></td><td><div className="customers-actions"><button type="button" aria-label={`View ${row.name}`} onClick={() => setViewing(row)}>⊙</button><button type="button" aria-label={`Edit ${row.name}`} onClick={() => setEditing(row)}>⋮</button></div></td></tr>)}</tbody></table> : <EmptyState title="No customers found" description="Try changing the filters or add a new customer."/>}</div>
      <footer className="customers-table-footer"><span>{filteredRows.length ? `Showing ${(page - 1) * 7 + 1} to ${Math.min(page * 7, filteredRows.length)} of ${filteredRows.length} customers` : "Showing 0 customers"}</span><div className="customers-pagination"><button type="button" disabled={page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))}>‹</button>{Array.from({ length: pageCount }, (_, index) => index + 1).map((value) => <button type="button" className={value === page ? "active" : ""} key={value} onClick={() => setPage(value)}>{value}</button>)}<button type="button" disabled={page === pageCount} onClick={() => setPage((value) => Math.min(pageCount, value + 1))}>›</button></div></footer>
    </section>

    {editing ? <CustomerModal customer={editing} onSave={save} onClose={() => setEditing(null)}/> : null}
    {viewing ? <CustomerDetailModal customer={viewing} onClose={() => setViewing(null)} onEdit={() => { setEditing(viewing); setViewing(null); }}/> : null}
  </div>;
}

function CustomerModal({ customer, onSave, onClose }) {
  return <div className="admin-modal-backdrop"><div className="admin-modal customers-form-modal" role="dialog" aria-modal="true" aria-labelledby="customer-form-title"><div className="admin-modal-head"><div><h2 id="customer-form-title">{customer.id ? "Edit" : "Add"} Customer</h2><p>Save contact and organization details.</p></div><button type="button" aria-label="Close customer form" onClick={onClose}>×</button></div><form onSubmit={onSave}><div className="admin-form-grid"><label>Name<input required name="name" defaultValue={customer.name || ""}/></label><label>Organization<input name="organization" defaultValue={customer.organization || ""}/></label><label>Designation<input name="designation" defaultValue={customer.designation || ""}/></label><label>Mobile<input name="phone" defaultValue={customer.phone || ""}/></label><label>Email<input type="email" name="email" defaultValue={customer.email || ""}/></label><label>Address<input name="address" defaultValue={customer.address || ""}/></label></div><label>Notes<textarea name="notes" rows="3" defaultValue={customer.notes || ""}/></label><label className="admin-check"><input name="is_active" type="checkbox" defaultChecked={customer.is_active !== false}/>Active customer</label><div className="admin-modal-actions"><button className="admin-button secondary" type="button" onClick={onClose}>Cancel</button><button className="admin-button primary">Save Customer</button></div></form></div></div>;
}

function CustomerDetailModal({ customer, onClose, onEdit }) {
  const details = [["Organization", customer.organization], ["Designation", customer.designation], ["Mobile", customer.phone], ["Email", customer.email], ["Address", customer.address], ["Total quotations", customer.total_quotations], ["Quoted value", customerMoney(customer.quoted_value)], ["Last quotation", customer.last_quotation_number]];
  return <div className="admin-modal-backdrop"><div className="admin-modal customers-detail-modal" role="dialog" aria-modal="true" aria-labelledby="customer-details-title"><div className="admin-modal-head"><div><h2 id="customer-details-title">{customer.name}</h2><p>Customer details and quotation activity</p></div><button type="button" aria-label="Close customer details" onClick={onClose}>×</button></div><div className="customers-detail-body"><div className="customers-detail-hero"><span className="customers-avatar tone-0">{customerInitials(customer.name)}</span><div><b>{customer.name}</b><StatusBadge active={customer.is_active}/></div></div><dl>{details.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl><button className="admin-button primary full" type="button" onClick={onEdit}>Edit Customer</button></div></div></div>;
}

const customerMoney = (value) => `৳${Number(value || 0).toLocaleString("en-US")}`;
const customerInitials = (name = "") => name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase() || "C";

export function UsersPage() {
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [editing, setEditing] = useState(null);
  const [resetUser, setResetUser] = useState(null);
  const [notice, setNotice] = useState("");
  const load = () => Promise.all([get("/admin/users"), get("/admin/roles")]).then(([users, roleRows]) => { setRows(users); setRoles(roleRows); });
  useEffect(() => { load().catch((error) => setNotice(error.message)); }, []);
  const save = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const body = { email: form.get("email"), display_name: form.get("display_name"), role_id: Number(form.get("role_id")), password: form.get("password"), is_active: form.get("is_active") === "on" };
    if (editing.id) await put(`/admin/users/${editing.id}`, body); else await post("/admin/users", body);
    setEditing(null); setNotice("User saved."); load();
  };
  const resetPassword = async (password) => {
    await post(`/admin/users/${resetUser.id}/reset-password`, { password });
    setResetUser(null);
    setNotice("Password reset. Existing sessions were revoked.");
  };
  return <>
    <PageHeader eyebrow="System" title="Users & Roles" description="Users sign in with email. Passwords are accepted only for creation/reset and never returned by the API." actions={<button className="admin-button primary" onClick={() => setEditing({ is_active: true })}>Add User</button>}/>
    <Notice message={notice}/>
    <div className="admin-table-wrap admin-panel"><table className="admin-table"><thead><tr><th>SL No.</th><th>User</th><th>Role</th><th>Status</th><th>Last Login</th><th>Actions</th></tr></thead><tbody>{rows.map((row,index) => <tr key={row.id}><td>{index+1}</td><td><b>{row.display_name}</b><small>{row.email}</small></td><td>{row.role_name}</td><td><StatusBadge active={row.is_active}/></td><td>{row.last_login_at ? new Date(row.last_login_at).toLocaleString() : "Never"}</td><td><button className="admin-link-button" onClick={() => setEditing(row)}>Edit</button><button className="admin-link-button admin-reset-password-button" onClick={() => setResetUser(row)}>Reset password</button></td></tr>)}</tbody></table></div>
    {editing ? <UserModal user={editing} roles={roles} onSave={save} onClose={() => setEditing(null)}/> : null}
    {resetUser ? <PasswordResetModal user={resetUser} onSave={resetPassword} onClose={() => setResetUser(null)}/> : null}
  </>;
}

function UserModal({user,roles,onSave,onClose}){return <div className="admin-modal-backdrop"><div className="admin-modal"><div className="admin-modal-head"><h2>{user.id?"Edit":"Add"} User</h2><button onClick={onClose}>×</button></div><form onSubmit={onSave}><label>Email<input required name="email" type="email" autoComplete="email" defaultValue={user.email}/></label><label>Display name<input required name="display_name" defaultValue={user.display_name}/></label><label>Role<select required name="role_id" defaultValue={user.role_id||""}><option value="">Select role</option>{roles.map((r)=><option key={r.id} value={r.id}>{r.name}</option>)}</select></label>{!user.id?<label>Password<input required minLength="6" type="password" name="password" autoComplete="new-password"/></label>:null}<label className="admin-check"><input name="is_active" type="checkbox" defaultChecked={user.is_active!==false}/>Active</label><div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Cancel</button><button className="admin-button primary">Save User</button></div></form></div></div>}

function PasswordResetModal({ user, onSave, onClose }) {
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") || "");
    const confirmation = String(form.get("password_confirmation") || "");
    if (password.length < 6) return setError("Password must be at least 6 characters.");
    if (password !== confirmation) return setError("Passwords do not match.");
    setSaving(true); setError("");
    try { await onSave(password); } catch (saveError) { setError(saveError.message); setSaving(false); }
  };
  return <div className="admin-modal-backdrop"><div className="admin-modal" role="dialog" aria-modal="true" aria-labelledby="reset-password-title"><div className="admin-modal-head"><div><h2 id="reset-password-title">Reset Password</h2><p>{user.email}</p></div><button type="button" onClick={onClose} aria-label="Close">×</button></div><form onSubmit={submit}><label>New password<input required minLength="6" type="password" name="password" autoComplete="new-password" autoFocus/></label><label>Confirm password<input required minLength="6" type="password" name="password_confirmation" autoComplete="new-password"/></label>{error ? <div className="admin-login-error" role="alert">{error}</div> : null}<div className="admin-modal-actions"><button type="button" className="admin-button secondary" onClick={onClose}>Cancel</button><button className="admin-button primary" disabled={saving}>{saving ? "Resetting…" : "Reset Password"}</button></div></form></div></div>;
}

export function ActivityLogsPage(){const [rows,setRows]=useState([]);useEffect(()=>{get("/admin/activity-logs?limit=100").then(setRows).catch(()=>setRows([]));},[]);return <><PageHeader eyebrow="System" title="Activity Logs" description="Important authenticated writes and sign-in activity, without passwords or secrets."/><div className="admin-table-wrap admin-panel">{rows.length?<table className="admin-table"><thead><tr><th>SL No.</th><th>Time</th><th>User</th><th>Action</th><th>Entity</th><th>Summary</th><th>Company</th></tr></thead><tbody>{rows.map((row,index)=><tr key={row.id}><td>{index+1}</td><td>{new Date(row.created_at).toLocaleString()}</td><td>{row.email||"System"}</td><td><span className="admin-chip">{row.action}</span></td><td>{row.entity_type}{row.entity_id?` #${row.entity_id}`:""}</td><td>{row.summary}</td><td>{row.company_name||"—"}</td></tr>)}</tbody></table>:<EmptyState title="No activity recorded"/>}</div></>}

export function SettingsPage({type="settings"}){const {companyId,company}=useCompany();const [data,setData]=useState(null),[notice,setNotice]=useState("");const load=useCallback(()=>companyId?get(`/admin/settings/${companyId}`).then(setData):Promise.resolve(),[companyId]);useEffect(()=>{load().catch((e)=>setNotice(e.message));},[load]);const calculatorType=type.startsWith("calculator-")?type.replace("calculator-",""):null;const item=calculatorType?data?.calculators?.find((row)=>row.calculator_type===calculatorType):null;const save=async(event)=>{event.preventDefault();const settings=JSON.parse(new FormData(event.currentTarget).get("json"));await put(`/admin/settings/${companyId}/${calculatorType}`,{settings});setNotice("Settings saved.");load();};const saveTemplate=async(event)=>{event.preventDefault();const payload=JSON.parse(new FormData(event.currentTarget).get("json"));const target=type==="invoice"?"invoice":"quotation";await put(`/admin/templates/${companyId}/${target}`,payload);setNotice("Template saved.");load();};const titles={"calculator-led-display":"LED Display Settings","calculator-rental-led":"Rental LED Settings","calculator-pa-system":"PA System Settings","calculator-conference-system":"Conference System Settings",quotation:"Quotation Pad",invoice:"Invoice Layout",terms:"Terms & Conditions",settings:"System Settings"};const templateData=type==="invoice"?data?.invoice:data?.quotation;return <><PageHeader eyebrow={calculatorType?"Calculators":"Templates & Settings"} title={titles[type]} description={`${company?.name||"Company"} configuration. Shared mathematical formulas remain in calculator code.`}/><Notice message={notice}/>{calculatorType?<section className="admin-panel admin-form-panel">{calculatorType==="rental-led"?<div className="admin-no-brand-banner"><b>Rental LED uses no brands</b><span>Indoor/outdoor configurations, rates, cabinet data, installation, and transport settings are managed directly.</span></div>:null}<form onSubmit={save}><label>Configuration JSON<textarea name="json" rows="18" defaultValue={JSON.stringify(item?.settings||{},null,2)}/></label><button className="admin-button primary">Save Settings</button></form></section>:type==="settings"?<section className="admin-panel admin-form-panel"><h2>System settings</h2><p>Database connection, API origin, and authentication lifetime are controlled through server environment variables and cannot be exposed or edited in the browser.</p></section>:type==="terms"?null:<section className="admin-panel admin-form-panel"><h2>{titles[type]}</h2><p>Template keys keep each company's visual layout independent without a drag-and-drop designer.</p><form onSubmit={saveTemplate}><label>Configuration JSON<textarea name="json" rows="20" defaultValue={JSON.stringify(templateData||{},null,2)}/></label><button className="admin-button primary">Save Template</button></form></section>}</>}
