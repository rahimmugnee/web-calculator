import { useCallback, useEffect, useState } from "react";
import { get, post, remove } from "../api";
import { EmptyState, Notice, PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";
import { QuotationDetails } from "./QuotationHistoryPage";

const money = (value) => value === null || value === undefined ? "—" : `৳${Number(value || 0).toLocaleString("en-US")}`;
const entityType = (row) => row.entity_type || "quotation";
const entityId = (row) => row.entity_id || row.id;
const itemName = (row) => row.item_name || row.quotation_number || row.name || `#${entityId(row)}`;
const typeLabel = (row) => row.type_label || (entityType(row) === "product" ? "Model" : `${entityType(row)[0].toUpperCase()}${entityType(row).slice(1)}`);

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
    setRows(await get(`/admin/recycle-bin?companyId=${companyId}&limit=100`));
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
    const id = entityId(row);
    setLoadingRowId(id);
    try {
      setSelected(await get(`/admin/quotations/trash/${id}?companyId=${companyId}`));
    } catch (error) {
      setNotice(error.message);
    } finally {
      setLoadingRowId(null);
    }
  };

  const runConfirmedAction = async () => {
    if (!confirmAction) return;
    const { type, row } = confirmAction;
    const kind = entityType(row), id = entityId(row), label = typeLabel(row), name = itemName(row);
    setSubmitting(true);
    try {
      if (type === "restore") {
        await post(`/admin/recycle-bin/${kind}/${id}/restore`, {});
        setNotice(`${label} ${name} restored.`);
      } else {
        await remove(`/admin/recycle-bin/${kind}/${id}/permanent`);
        if (selected?.id === id) setSelected(null);
        setNotice(`${label} ${name} permanently deleted.`);
      }
      setConfirmAction(null);
      await load();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  const confirmLabel = confirmAction ? typeLabel(confirmAction.row) : "Item";
  const confirmName = confirmAction ? itemName(confirmAction.row) : "";

  return <>
    <PageHeader eyebrow="Templates" title="Recycle Bin" description="Restore or permanently delete quotations, models, brands, and categories removed from this project." />
    <Notice message={notice} onClose={() => setNotice("")} />
    <div className="admin-table-wrap admin-panel recycle-bin-table">
      {rows.length ? <table className="admin-table">
        <thead><tr><th>SL No.</th><th>Type</th><th>Item / Ref No.</th><th>Deleted At</th><th>Details</th><th>Amount (BDT)</th><th>View</th><th>Status</th><th>Action</th><th>Delete</th></tr></thead>
        <tbody>{rows.map((row, index) => {
          const kind = entityType(row), id = entityId(row), quotation = kind === "quotation";
          return <tr key={`${kind}-${id}`}>
            <td>{index + 1}</td>
            <td><span className={`recycle-type ${kind}`}>{typeLabel(row)}</span></td>
            <td><b>{itemName(row)}</b></td>
            <td>{new Date(row.deleted_at).toLocaleString("en-GB")}</td>
            <td>{row.details || row.client_name || "—"}</td>
            <td><b>{money(row.amount ?? row.grand_total)}</b></td>
            <td>{quotation ? <button className="quotation-view-button" onClick={() => open(row)} aria-haspopup="dialog" disabled={loadingRowId === id}>{loadingRowId === id ? "Loading..." : "View Quotation"}</button> : "—"}</td>
            <td><span className="recycle-status">{row.status || "deleted"}</span></td>
            <td><button className="quotation-restore-button" onClick={() => setConfirmAction({ type: "restore", row })} aria-haspopup="dialog">Restore</button></td>
            <td><button className="quotation-permanent-delete-button" onClick={() => setConfirmAction({ type: "delete", row })} aria-haspopup="dialog">Delete Permanently</button></td>
          </tr>;
        })}</tbody>
      </table> : <EmptyState title="Recycle Bin is empty" description="Deleted quotations, models, brands, and categories will appear here and can be restored." />}
    </div>
    {selected ? <div className="quotation-preview-backdrop" onMouseDown={() => setSelected(null)}><div id={`recycle-quotation-details-${selected.id}`} className="quotation-preview-modal" role="dialog" aria-modal="true" aria-labelledby={`recycle-quotation-details-title-${selected.id}`} onMouseDown={(event) => event.stopPropagation()}><QuotationDetails titleId={`recycle-quotation-details-title-${selected.id}`} row={selected} onClose={() => setSelected(null)} /></div></div> : null}
    {confirmAction ? <div className="quotation-preview-backdrop quotation-delete-backdrop" onMouseDown={() => { if (!submitting) setConfirmAction(null); }}>
      <section className={`quotation-delete-confirm recycle-confirm ${confirmAction.type}`} role="dialog" aria-modal="true" aria-labelledby="recycle-confirm-title" onMouseDown={(event) => event.stopPropagation()}>
        <div className="quotation-delete-icon" aria-hidden="true">{confirmAction.type === "restore" ? "↻" : "!"}</div>
        <h2 id="recycle-confirm-title">{confirmAction.type === "restore" ? `Restore ${confirmLabel.toLowerCase()}?` : "Delete permanently?"}</h2>
        <p>{confirmAction.type === "restore" ? <>Are you sure you want to restore <strong>{confirmName}</strong>? It will return to its original location.</> : <>Are you sure you want to permanently delete <strong>{confirmName}</strong>? This cannot be undone or restored.</>}</p>
        <div className="quotation-delete-actions">
          <button type="button" className="quotation-delete-cancel" onClick={() => setConfirmAction(null)} disabled={submitting} autoFocus>Cancel</button>
          <button type="button" className="quotation-delete-confirm-button" onClick={runConfirmedAction} disabled={submitting}>{submitting ? (confirmAction.type === "restore" ? "Restoring..." : "Deleting...") : (confirmAction.type === "restore" ? `Restore ${confirmLabel}` : "Delete Permanently")}</button>
        </div>
      </section>
    </div> : null}
  </>;
}
