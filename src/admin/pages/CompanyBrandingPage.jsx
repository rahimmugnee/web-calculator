import { useEffect, useMemo, useRef, useState } from "react";
import { put } from "../api";
import { Notice } from "../AdminLayout";
import { useCompany } from "../contexts";

const assetDefinitions = [
  ["logo", "Company Logo"],
  ["invoice_pad", "Letterhead Pad"],
  ["seal", "Company Seal"],
  ["signature", "Authorized Signature"],
];

const fileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ name: file.name, data: reader.result });
  reader.onerror = reject;
  reader.readAsDataURL(file);
});

function publicAssetUrl(companyId, type) {
  const apiBase = process.env.REACT_APP_ADMIN_API_URL || "/api";
  return `${new URL(apiBase, window.location.origin).origin}/api/public/company/${companyId}/assets/${type}`;
}

function AssetCard({ company, type, label, selectedFile, removed, onSelect, onRemove, onPreview }) {
  const inputRef = useRef(null);
  const objectUrl = useMemo(() => selectedFile ? URL.createObjectURL(selectedFile) : null, [selectedFile]);
  useEffect(() => () => { if (objectUrl) URL.revokeObjectURL(objectUrl); }, [objectUrl]);
  const currentName = selectedFile?.name || company.assets?.[type];
  const preview = objectUrl || (!removed && company.assets?.[type] ? `${publicAssetUrl(company.id, type)}?v=${company.updated_at || "1"}` : null);
  return <article className={`company-asset-card${type === "signature" ? " signature-card" : ""}`}>
    <h3>{label} <span title="PNG, JPG or WEBP; maximum 5 MB">?</span></h3>
    <button type="button" className="company-asset-preview" disabled={!preview} onClick={() => preview && onPreview({ src:preview, label })} aria-label={preview ? `View full ${label}` : `No ${label} uploaded`}>{preview ? <><img src={preview} alt={label}/><span className="asset-preview-hint">⛶ View full image</span></> : <div>No image uploaded</div>}</button>
    <div className="company-asset-file"><b>{currentName || "No file"}</b><small>{selectedFile ? "Ready to upload" : currentName ? "Stored in database" : "Choose an image"}</small></div>
    <input ref={inputRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onSelect(type, event.target.files?.[0] || null)}/>
    <div className="company-asset-actions"><button type="button" className="admin-button secondary" onClick={() => inputRef.current?.click()}>↥ Replace</button><button type="button" className="admin-button asset-remove" disabled={!currentName} onClick={() => onRemove(type)}>♲ Remove</button></div>
  </article>;
}

export default function CompanyBrandingPage() {
  const { company, refreshCompanies } = useCompany();
  const [files, setFiles] = useState({});
  const [removed, setRemoved] = useState([]);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => { setFiles({}); setRemoved([]); setNotice(""); setError(""); }, [company?.id]);
  useEffect(() => { if (!preview) return undefined; const close = (event) => { if (event.key === "Escape") setPreview(null); }; window.addEventListener("keydown", close); return () => window.removeEventListener("keydown", close); }, [preview]);
  if (!company) return <div className="admin-loading">Loading company…</div>;

  const selectFile = (type, file) => {
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) return setError("Each image must be 5 MB or smaller.");
    setFiles((current) => ({ ...current, [type]: file }));
    setRemoved((current) => current.filter((item) => item !== type));
    setError("");
  };
  const removeAsset = (type) => { setFiles((current) => ({ ...current, [type]: null })); setRemoved((current) => current.includes(type) ? current : [...current, type]); };
  const cancel = () => { setFiles({}); setRemoved([]); setNotice(""); setError(""); };
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError("");
    try {
      const form = new FormData(event.currentTarget); const body = Object.fromEntries(form); body.is_active = company.is_active; body.is_default = company.is_default; body.assets = {}; body.remove_assets = removed;
      for (const [type, file] of Object.entries(files)) if (file) body.assets[type] = await fileAsDataUrl(file);
      await put(`/admin/companies/${company.id}`, body); await refreshCompanies(); setFiles({}); setRemoved([]); setNotice("Company branding saved successfully.");
    } catch (saveError) { setError(saveError.message); } finally { setSaving(false); }
  };

  return <form key={company.id} className="company-branding-page" onSubmit={save}>
    <div className="company-editor-breadcrumb">Companies <span>›</span> {company.name} <span>›</span> <b>Edit Company</b></div>
    <div className="company-editor-header"><div><h1>Edit Company</h1><p>Manage company information and branding assets.</p></div><div><button type="button" className="admin-button secondary" onClick={cancel}>Cancel</button><button className="admin-button primary" disabled={saving}>{saving ? "Saving…" : "Save Changes"}</button></div></div>
    <Notice message={notice}/>{error ? <div className="admin-notice company-error">{error}</div> : null}
    <section className="company-branding-panel admin-panel">
      <div className="company-branding-heading"><div><h2>Company Branding & Assets</h2><p>Manage your company&apos;s logo, letterhead pad, seal, signature and signatory details.</p></div><div className="company-upload-tip"><b>ⓘ &nbsp; Upload high-quality files for best results.</b><small>Recommended: PNG for images with transparent background.</small></div></div>
      <div className="company-assets-grid">{assetDefinitions.slice(0,3).map(([type,label]) => <AssetCard key={type} company={company} type={type} label={label} selectedFile={files[type]} removed={removed.includes(type)} onSelect={selectFile} onRemove={removeAsset} onPreview={setPreview}/>)}</div>
      <div className="company-details-grid"><AssetCard company={company} type="signature" label="Authorized Signature" selectedFile={files.signature} removed={removed.includes("signature")} onSelect={selectFile} onRemove={removeAsset} onPreview={setPreview}/><section className="signatory-panel"><h3>Authorized Signatory Information <span title="This information appears on quotations">?</span></h3><div className="signatory-form-grid"><label>Name *<input name="signatory_name" required defaultValue={company.signatory_name||""}/></label><label>Designation *<input name="signatory_designation" required defaultValue={company.signatory_designation||""}/></label><label>Mobile / Phone *<input name="signatory_phone" required defaultValue={company.signatory_phone||""}/></label><label>Email *<input name="signatory_email" type="email" required defaultValue={company.signatory_email||""}/></label><label>Company / Organization<input name="signatory_company_name" defaultValue={company.signatory_company_name||company.name}/></label></div></section></div>
      <input type="hidden" name="name" value={company.name}/><input type="hidden" name="code" value={company.code}/>
      <div className="company-upload-footer">ⓘ &nbsp; Supported file types: PNG, JPG, JPEG, WEBP <span/> Maximum file size: 5MB per file</div>
    </section>{preview ? <div className="asset-lightbox" role="dialog" aria-modal="true" aria-label={`${preview.label} preview`} onMouseDown={(event) => { if (event.target === event.currentTarget) setPreview(null); }}><div className="asset-lightbox-content"><div className="asset-lightbox-head"><b>{preview.label}</b><button type="button" onClick={() => setPreview(null)} aria-label="Close image preview">×</button></div><div className="asset-lightbox-image"><img src={preview.src} alt={preview.label}/></div></div></div> : null}
  </form>;
}
