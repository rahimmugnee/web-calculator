import { useCallback, useEffect, useState } from "react";
import { get, post, remove } from "../api";
import { EmptyState, Notice, PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";
import { QuotationDetails } from "./QuotationHistoryPage";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-US")}`;

export default function RecycleBinPage() {
  const { companyId } = useCompany();
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");
  const [confirmAction, setConfirmAction] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [selected, setSelected] = useState(null);
  const [loadingRowId, setLoadingRowId] = useState(null);
  const load = useCallback(async () => {
    if (!companyId) return;
    setRows(await get(`/admin/quotations/trash?companyId=${companyId}&limit=100`));
  }, [companyId]);

  useEffect(() => { load().catch((error) => setNotice(error.message)); }, [load]);
  useEffect(() => {
    const refresh = () => load().catch((error) => setNotice(error.message));
    const poll = window.setInterval(refresh, 5000);
    window.addEventListener("focus", refresh);
    return () => { window.clearInterval(poll); window.removeEventListener("focus", refresh); };
  }, [load]);

  useEffect(() => {
    if (!confirmAction && !selected) return undefined;
    const previousOverflow = document.body.style.overflow;
    const closeOnEscape = (event) => {
      if (event.key !== "Escape") return;
      if (confirmAction && !submitting) setConfirmAction(null);
      else if (!confirmAction) setSelected(null);
    };
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [confirmAction, selected, submitting]);

  const open = async (row) => {
    setLoadingRowId(row.id);
    try {
      setSelected(await get(`/admin/quotations/trash/${row.id}?companyId=${companyId}`));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoadingRowId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, row } = confirmAction;
    setSubmitting(true);
    try {
      if (type === "restore") {
        await post(`/admin/quotations/${row.id}/restore`, {});
        setNotice(`Quotation ${row.quotation_number} restored.`);
      } else {
        await remove(`/admin/quotations/${row.id}/permanent`);
        setNotice(`Quotation ${row.quotation_number} permanently deleted.`);
      }
      setConfirmAction(null);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  return <>
    <PageHeader eyebrow="Templates" title="Recycle Bin" description="Restore quotations that were removed from quotation history." />
    <Notice message={notice} onClose={() => setNotice("")} />
    <div className="admin-table-wrap admin-panel recycle-bin-table">
      {rows.length ? <table className="admin-table">
        <thead><tr><th>SL No.</th><th>Ref No.</th><th>Deleted At</th><th>Client</th><th>Organization</th><th>Amount (BDT)</th><th>View</th><th>Status</th><th>Action</th><th>Delete</th></tr></thead>
        <tbody>{rows.map((row, index) => {
          const client = row.client_information || {};
          return <tr key={row.id}>
            <td>{index + 1}</td>
            <td><b>{row.quotation_number}</b></td>
            <td>{new Date(row.deleted_at).toLocaleString("en-GB")}</td>
            <td>{row.client_name || "—"}</td>
            <td>{client.company || client.organization || "—"}</td>
            <td><b>{money(row.grand_total)}</b></td>
            <td><button className="quotation-view-button" onClick={() => open(row)} aria-haspopup="dialog" disabled={loadingRowId === row.id}>{loadingRowId === row.id ? "Loading..." : "View Quotation"}</button></td>
            <td><span className="recycle-status">{row.status}</span></td>
            <td><button className="quotation-restore-button" onClick={() => setConfirmAction({ type: "restore", row })} aria-haspopup="dialog">Restore</button></td>
            <td><button className="quotation-permanent-delete-button" onClick={() => setConfirmAction({ type: "delete", row })} aria-haspopup="dialog">Delete Permanently</button></td>
          </tr>;
        })}</tbody>
      </table> : <EmptyState title="Recycle Bin is empty" description="Deleted quotations will appear here and can be restored." />}
    </div>
    {selected ? <div className="quotation-preview-backdrop" onMouseDown={() => setSelected(null)}><div id={`recycle-quotation-details-${selected.id}`} className="quotation-preview-modal" role="dialog" aria-modal="true" aria-labelledby={`recycle-quotation-details-title-${selected.id}`} onMouseDown={(event) => event.stopPropagation()}><QuotationDetails titleId={`recycle-quotation-details-title-${selected.id}`} row={selected} onClose={() => setSelected(null)} /></div></div> : null}
    {confirmAction ? <div className="quotation-preview-backdrop quotation-delete-backdrop" onMouseDown={() => { if (!submitting) setConfirmAction(null); }}>
      <section className={`quotation-delete-confirm recycle-confirm ${confirmAction.type}`} role="dialog" aria-modal="true" aria-labelledby="recycle-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quotation-delete-icon" aria-hidden="true">{confirmAction.type === "restore" ? "↻" : "!"}</div>
        <h2 id="recycle-confirm-title">{confirmAction.type === "restore" ? "Restore quotation?" : "Delete permanently?"}</h2>
        <p>{confirmAction.type === "restore" ? <>Are you sure you want to restore <strong>{confirmAction.row.quotation_number}</strong>? It will return to quotation history.</> : <>Are you sure you want to permanently delete <strong>{confirmAction.row.quotation_number}</strong>? This cannot be undone or restored.</>}</p>
        <div className="quotation-delete-actions">
          <button type="button" className="quotation-delete-cancel" onClick={() => setConfirmAction(null)} disabled={submitting} autoFocus>Cancel</button>
          <button type="button" className="quotation-delete-confirm-button" onClick={runConfirmedAction} disabled={submitting}>{submitting ? (confirmAction.type === "restore" ? "Restoring..." : "Deleting...") : (confirmAction.type === "restore" ? "Restore Quotation" : "Delete Permanently")}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
