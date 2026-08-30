import { useCallback, useEffect, useState } from "react";
import { get, post, remove } from "../api";
import { EmptyState, Notice, PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-US")}`;

export default function RecycleBinPage() {
  const { companyId } = useCompany();
  const [rows, setRows] = useState([]);
  const [notice, setNotice] = useState("");
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

  const restore = async (row) => {
    await post(`/admin/quotations/${row.id}/restore`, {});
    setNotice(`Quotation ${row.quotation_number} restored.`);
    await load();
  };

  const permanentlyDelete = async (row) => {
    if (!window.confirm(`Permanently delete quotation ${row.quotation_number}?`)) return;
    if (!window.confirm("This cannot be undone or restored. Delete permanently?")) return;
    await remove(`/admin/quotations/${row.id}/permanent`);
    setNotice(`Quotation ${row.quotation_number} permanently deleted.`);
    await load();
  };

  return <>
    <PageHeader eyebrow="Templates" title="Recycle Bin" description="Restore quotations that were removed from quotation history." />
    <Notice message={notice} onClose={() => setNotice("")} />
    <div className="admin-table-wrap admin-panel recycle-bin-table">
      {rows.length ? <table className="admin-table">
        <thead><tr><th>Ref No.</th><th>Deleted At</th><th>Client</th><th>Organization</th><th>Amount (BDT)</th><th>Status</th><th>Action</th><th>Delete</th></tr></thead>
        <tbody>{rows.map((row) => {
          const client = row.client_information || {};
          return <tr key={row.id}>
            <td><b>{row.quotation_number}</b></td>
            <td>{new Date(row.deleted_at).toLocaleString("en-GB")}</td>
            <td>{row.client_name || "—"}</td>
            <td>{client.company || client.organization || "—"}</td>
            <td><b>{money(row.grand_total)}</b></td>
            <td><span className="recycle-status">{row.status}</span></td>
            <td><button className="quotation-restore-button" onClick={() => restore(row)}>Restore</button></td>
            <td><button className="quotation-permanent-delete-button" onClick={() => permanentlyDelete(row)}>Delete Permanently</button></td>
          </tr>;
        })}</tbody>
      </table> : <EmptyState title="Recycle Bin is empty" description="Deleted quotations will appear here and can be restored." />}
    </div>
  </>;
}
