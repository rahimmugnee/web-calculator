import { useCallback, useEffect, useState } from "react";
import { get, patch, post, remove } from "../api";
import { EmptyState, Notice, PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-US")}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "—";
const text = (value) => value || "—";

export default function QuotationHistoryPage() {
  const { companyId } = useCompany();
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [loadingRowId, setLoadingRowId] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    if (!companyId) return;
    const query = new URLSearchParams({ companyId: String(companyId), limit: "100" });
    if (search) query.set("search", search);
    if (status) query.set("status", status);
    setRows(await get(`/admin/quotations?${query}`));
  }, [companyId, search, status]);

  useEffect(() => {
    const timer = setTimeout(() => load().catch((error) => setNotice(error.message)), 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    const refresh = () => load().catch((error) => setNotice(error.message));
    let channel;
    try {
      channel = new BroadcastChannel("quotation-history-live");
      channel.addEventListener("message", refresh);
    } catch {}
    const onStorage = (event) => {
      if (event.key === "quotationHistoryLiveUpdate") refresh();
    };
    window.addEventListener("storage", onStorage);
    const poll = window.setInterval(refresh, 5000);
    return () => {
      channel?.close();
      window.removeEventListener("storage", onStorage);
      window.clearInterval(poll);
    };
  }, [load]);

  useEffect(() => {
    if (!selected && !deleteTarget) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (deleteTarget && !deleting) setDeleteTarget(null);
      else if (!deleteTarget) setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [selected, deleteTarget, deleting]);

  const open = async (row) => {
    if (selected?.id === row.id) {
      setSelected(null);
      return;
    }

    setLoadingRowId(row.id);
    try {
      const viewed = await post(`/admin/quotations/${row.id}/viewed`, {});
      setRows((current) => current.map((item) => item.id === row.id ? { ...item, viewed_at: viewed.viewed_at } : item));
      setSelected(await get(`/admin/quotations/${row.id}`));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoadingRowId(null);
    }
  };

  const changeStatus = async (row, value) => {
    await patch(`/admin/quotations/${row.id}/status`, { status: value });
    setNotice("Quotation status updated.");
    await load();
    if (selected?.id === row.id) setSelected(await get(`/admin/quotations/${row.id}`));
  };

  const destroy = async () => {
    if (!deleteTarget) return;
    const row = deleteTarget;
    setDeleting(true);
    try {
      await remove(`/admin/quotations/${row.id}`);
      if (selected?.id === row.id) setSelected(null);
      setDeleteTarget(null);
      setNotice("Quotation deleted.");
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setDeleting(false);
    }
  };

  return <>
    <PageHeader eyebrow="Sales" title="Quotations" description="Track downloaded quotations with complete client information and itemized price snapshots." />
    <Notice message={notice} onClose={() => setNotice("")} />
    <div className="quotation-history-layout">
      <section className="quotation-history-main">
        <div className="quotation-filters admin-panel">
          <label>Search<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Ref no, client or organization..." /></label>
          <label>Status<select value={status} onChange={(event) => setStatus(event.target.value)}><option value="">All Status</option>{["final", "sent", "approved", "draft", "rejected", "expired"].map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
        <div className="admin-table-wrap admin-panel quotation-list">
          <table className="admin-table">
            <thead><tr><th>SL No.</th><th>Ref No.</th><th>Date</th><th>Client</th><th>Organization</th><th>Amount (BDT)</th><th>Created By</th><th>Status</th><th>Actions</th><th>Delete</th></tr></thead>
            <tbody>{rows.map((row, index) => {
              const client = row.client_information || {};
              const isOpen = selected?.id === row.id;
              const isLoading = loadingRowId === row.id;
              const detailsId = `quotation-details-${row.id}`;

              return <tr key={row.id} className={isOpen ? "selected-row" : ""}>
                <td>{index + 1}</td>
                <td><b>{row.quotation_number}</b></td>
                <td>{date(row.created_at)}</td>
                <td>{text(row.client_name)}</td>
                <td>{text(client.company || client.organization)}</td>
                <td><b>{money(row.grand_total)}</b></td>
                <td className="quotation-created-by"><b>{text(row.created_by_name || row.created_by)}</b>{row.created_by_email ? <small>{row.created_by_email}</small> : null}</td>
                <td><select value={row.status} onChange={(event) => changeStatus(row, event.target.value)}>{["draft", "final", "sent", "approved", "rejected", "expired"].map((item) => <option key={item}>{item}</option>)}</select></td>
                <td><div className="quotation-view-wrap"><button className="quotation-view-button" onClick={() => open(row)} title="View quotation" aria-haspopup="dialog" aria-controls={detailsId} disabled={isLoading}>{isLoading ? "Loading..." : "View Quotation"}</button>{!row.viewed_at ? <span className="quotation-new-badge">New</span> : null}</div></td>
                <td><button className="quotation-delete-button" onClick={() => setDeleteTarget(row)} title="Delete quotation" aria-haspopup="dialog">Delete</button></td>
              </tr>;
            })}</tbody>
          </table>
          {!rows.length ? <EmptyState title="No downloaded quotations" description="A quotation will appear here after its PDF is downloaded from the calculator." /> : null}
          <footer className="quotation-list-footer">{rows.length ? `Showing ${rows.length} of ${rows[0]?.total_count || rows.length} quotations` : ""}</footer>
        </div>
      </section>
    </div>
    <div className="quotation-history-note">ⓘ Amounts and item prices are saved as a snapshot at the time of PDF download.</div>
    {selected ? <div className="quotation-preview-backdrop" onMouseDown={() => setSelected(null)}><div id={`quotation-details-${selected.id}`} className="quotation-preview-modal" role="dialog" aria-modal="true" aria-labelledby={`quotation-details-title-${selected.id}`} onMouseDown={(event) => event.stopPropagation()}><QuotationDetails titleId={`quotation-details-title-${selected.id}`} row={selected} onClose={() => setSelected(null)} /></div></div> : null}
    {deleteTarget ? <div className="quotation-preview-backdrop quotation-delete-backdrop" onMouseDown={() => { if (!deleting) setDeleteTarget(null); }}><section className="quotation-delete-confirm" role="dialog" aria-modal="true" aria-labelledby="quotation-delete-title" onMouseDown={(event) => event.stopPropagation()}><div className="quotation-delete-icon" aria-hidden="true">!</div><h2 id="quotation-delete-title">Delete quotation?</h2><p>Are you sure you want to delete <strong>{deleteTarget.quotation_number}</strong>? It will be moved to the Recycle Bin.</p><div className="quotation-delete-actions"><button type="button" className="quotation-delete-cancel" onClick={() => setDeleteTarget(null)} disabled={deleting} autoFocus>Cancel</button><button type="button" className="quotation-delete-confirm-button" onClick={destroy} disabled={deleting}>{deleting ? "Deleting..." : "Delete Quotation"}</button></div></section></div> : null}
  </>;
}

export function QuotationDetails({ titleId, row, onClose }) {
  const client = row.client_information || {};
  const form = row.snapshot_data?.form || {};
  const quality = form.tier?.label || form.tier?.id;
  const proposalTitle = quotationProposalTitle(form, row);

  return <section className="quotation-details">
    <header><div><h2 id={titleId}>Quotation Details</h2><span className="quotation-status">{row.status}</span></div><button onClick={onClose} title="Close quotation details" aria-label="Close quotation details">×</button></header>
    <div className="quotation-ref"><div><small>Ref No.</small><strong>{row.quotation_number}</strong></div><div><small>Date</small><strong>{date(row.created_at)}</strong></div></div>
    <DetailSection title="Client Information" badge={quality ? `Quality: ${quality}` : null}><dl className="quotation-client-grid"><div><dt>Name:</dt><dd>{text(client.name)}</dd></div><div><dt>Designation:</dt><dd>{text(client.position || client.designation)}</dd></div><div><dt>Organization:</dt><dd>{text(client.company || client.organization)}</dd></div><div><dt>Mobile Number:</dt><dd>{text(client.mobile || client.phone)}</dd></div>{client.email ? <div><dt>Email:</dt><dd>{client.email}</dd></div> : null}<div><dt>Address:</dt><dd>{text(client.address)}</dd></div></dl></DetailSection>
    <section className="quotation-detail-section quotation-items-section"><h3 className="quotation-proposal-title">{proposalTitle}</h3><div className="quotation-items-wrap"><table><thead><tr><th>SL No.</th><th>Item Name</th><th>Brand</th><th>Model</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{row.items?.map((item) => <tr key={item.id}><td>{item.line_number}</td><td>{item.item_description}</td><td>{text(item.snapshot_data?.brand)}</td><td>{text(item.model_description)}</td><td>{item.unit}</td><td>{Number(item.quantity)}</td><td>{money(item.unit_price)}</td><td>{money(item.total_price)}</td></tr>)}</tbody><tfoot><tr><td colSpan="7">Grand Total</td><td>{money(row.grand_total)}</td></tr></tfoot></table></div></section>
    <footer><span>Created By<br /><b>{row.created_by_name || row.created_by || "Unknown user"}</b>{row.created_by_email ? <small>{row.created_by_email}</small> : null}</span><span>Created At<br /><b>{new Date(row.created_at).toLocaleString()}</b></span><span>Last Updated<br /><b>{new Date(row.updated_at).toLocaleString()}</b></span></footer>
  </section>;
}

function DetailSection({ title, badge, children }) {
  return <section className="quotation-detail-section"><h3>{title}{badge ? <span>{badge}</span> : null}</h3>{children}</section>;
}

function quotationProposalTitle(form, row) {
  if (form.quotationType === "pa") return form.paInstallationType === "ip" ? "Proposal For IP PA System" : "Proposal For Wired PA System";
  if (form.quotationType === "conference") return form.conferenceSystemType === "wireless" ? "Proposal For Wireless Conference System" : "Proposal For Wired Conference System";
  if (form.quotationType === "rental") return "Rental LED Display Quotation";

  const display = form.display || {};
  const modelName = String(form.model?.name || row.items?.[0]?.model_description || "").trim();
  const technology = String(form.items?.technology || "").trim().toUpperCase();
  const namePart = modelName ? `${modelName}${technology ? ` (${technology})` : ""} LED Display.` : "LED Display Proposal.";
  const sizePart = display.widthFt || display.heightFt ? ` (${display.widthFt || "—"}ft × ${display.heightFt || "—"}ft)` : "";
  const areaPart = display.sft ? ` | Sft: (${display.sft})` : "";
  return `Proposal for ${namePart}${sizePart}${areaPart}`;
}
