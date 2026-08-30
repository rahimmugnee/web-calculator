import { useCallback, useEffect, useState } from "react";
import { get, patch, post, remove } from "../api";
import { EmptyState, Notice, PageHeader } from "../AdminLayout";
import { useCompany } from "../contexts";

const money = (value) => `৳${Number(value || 0).toLocaleString("en-US")}`;
const date = (value) => value ? new Date(value).toLocaleDateString("en-GB") : "—";
const text = (value) => value || "—";

export default function QuotationHistoryPage(){
  const {companyId}=useCompany();
  const [rows,setRows]=useState([]),[selected,setSelected]=useState(null),[search,setSearch]=useState(""),[status,setStatus]=useState(""),[notice,setNotice]=useState("");
  const load=useCallback(async()=>{if(!companyId)return;const query=new URLSearchParams({companyId:String(companyId),limit:"100"});if(search)query.set("search",search);if(status)query.set("status",status);setRows(await get(`/admin/quotations?${query}`));},[companyId,search,status]);
  useEffect(()=>{const timer=setTimeout(()=>load().catch((e)=>setNotice(e.message)),200);return()=>clearTimeout(timer);},[load]);
  useEffect(()=>{
    const refresh=()=>load().catch((e)=>setNotice(e.message));
    let channel;
    try{channel=new BroadcastChannel("quotation-history-live");channel.addEventListener("message",refresh);}catch{}
    const onStorage=(event)=>{if(event.key==="quotationHistoryLiveUpdate")refresh();};
    window.addEventListener("storage",onStorage);
    const poll=window.setInterval(refresh,5000);
    return()=>{channel?.close();window.removeEventListener("storage",onStorage);window.clearInterval(poll);};
  },[load]);
  const open=async(row)=>{const viewed=await post(`/admin/quotations/${row.id}/viewed`,{});setRows((current)=>current.map((item)=>item.id===row.id?{...item,viewed_at:viewed.viewed_at}:item));setSelected(await get(`/admin/quotations/${row.id}`));};
  const changeStatus=async(row,value)=>{await patch(`/admin/quotations/${row.id}/status`,{status:value});setNotice("Quotation status updated.");await load();if(selected?.id===row.id)await open(row);};
  const destroy=async(row)=>{if(!window.confirm(`Delete quotation ${row.quotation_number}? This cannot be undone.`))return;await remove(`/admin/quotations/${row.id}`);if(selected?.id===row.id)setSelected(null);setNotice("Quotation deleted.");await load();};
  return <>
    <PageHeader eyebrow="Sales" title="Quotations" description="Track downloaded quotations with complete client information and itemized price snapshots."/>
    <Notice message={notice} onClose={()=>setNotice("")}/>
    <div className={selected?"quotation-history-layout details-open":"quotation-history-layout"}>
      <section className="quotation-history-main">
        <div className="quotation-filters admin-panel"><label>Search<input value={search} onChange={(e)=>setSearch(e.target.value)} placeholder="Ref no, client or organization..."/></label><label>Status<select value={status} onChange={(e)=>setStatus(e.target.value)}><option value="">All Status</option>{["final","sent","approved","draft","rejected","expired"].map((item)=><option key={item}>{item}</option>)}</select></label></div>
        <div className="admin-table-wrap admin-panel quotation-list"><table className="admin-table"><thead><tr><th>Ref No.</th><th>Date</th><th>Client</th><th>Organization</th><th>Amount (BDT)</th><th>Status</th><th>Actions</th><th>Delete</th></tr></thead><tbody>{rows.map((row)=>{const client=row.client_information||{};return <tr key={row.id} className={selected?.id===row.id?"selected-row":""}><td><b>{row.quotation_number}</b></td><td>{date(row.created_at)}</td><td>{text(row.client_name)}</td><td>{text(client.company||client.organization)}</td><td><b>{money(row.grand_total)}</b></td><td><select value={row.status} onChange={(e)=>changeStatus(row,e.target.value)}>{["draft","final","sent","approved","rejected","expired"].map((item)=><option key={item}>{item}</option>)}</select></td><td><div className="quotation-view-wrap"><button className="quotation-view-button" onClick={()=>open(row)} title="View quotation">View Quotation</button>{!row.viewed_at?<span className="quotation-new-badge">New</span>:null}</div></td><td><button className="quotation-delete-button" onClick={()=>destroy(row)} title="Delete quotation">Delete</button></td></tr>})}</tbody></table>{!rows.length?<EmptyState title="No downloaded quotations" description="A quotation will appear here after its PDF is downloaded from the calculator."/>:null}<footer className="quotation-list-footer">{rows.length?`Showing ${rows.length} of ${rows[0]?.total_count||rows.length} quotations`:""}</footer></div>
      </section>
      {selected?<QuotationDetails row={selected} onClose={()=>setSelected(null)}/>:null}
    </div>
    <div className="quotation-history-note">ⓘ Amounts and item prices are saved as a snapshot at the time of PDF download.</div>
  </>;
}

function QuotationDetails({row,onClose}){
  const client=row.client_information||{},form=row.snapshot_data?.form||{},display=form.display||{},quality=form.tier?.label||form.tier?.id;
  return <aside className="quotation-details admin-panel"><header><div><h2>Quotation Details</h2><span className="quotation-status">{row.status}</span></div><button onClick={onClose}>×</button></header><div className="quotation-ref"><div><small>Ref No.</small><strong>{row.quotation_number}</strong></div><div><small>Date</small><strong>{date(row.created_at)}</strong></div></div>
    <DetailSection title="Client Information" badge={quality?`Quality: ${quality}`:null}><dl><dt>Name</dt><dd>{text(client.name)}</dd><dt>Designation</dt><dd>{text(client.position||client.designation)}</dd><dt>Organization</dt><dd>{text(client.company||client.organization)}</dd><dt>Mobile Number</dt><dd>{text(client.mobile||client.phone)}</dd>{client.email?<><dt>Email</dt><dd>{client.email}</dd></>:null}<dt>Address</dt><dd>{text(client.address)}</dd></dl></DetailSection>
    <DetailSection title="Quotation Information"><dl className="two-column"><dt>Company</dt><dd>{row.company_name}</dd><dt>System</dt><dd>{String(row.calculator_type||"").replaceAll("-"," ")}</dd><dt>Display Type</dt><dd>{text(form.items?.dispType)}</dd><dt>Technology</dt><dd>{text(form.items?.technology)}</dd><dt>Size (W × H)</dt><dd>{display.widthFt&&display.heightFt?`${display.widthFt} × ${display.heightFt} ft`:"—"}</dd><dt>Area</dt><dd>{display.sft?`${display.sft} sft`:"—"}</dd><dt>Grand Total</dt><dd><b>{money(row.grand_total)}</b></dd></dl></DetailSection>
    <DetailSection title="Itemized Snapshot"><div className="quotation-items-wrap"><table><thead><tr><th>SL.</th><th>Item Name</th><th>Brand</th><th>Model</th><th>Unit</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead><tbody>{row.items?.map((item)=><tr key={item.id}><td>{item.line_number}</td><td>{item.item_description}</td><td>{text(item.snapshot_data?.brand)}</td><td>{text(item.model_description)}</td><td>{item.unit}</td><td>{Number(item.quantity)}</td><td>{money(item.unit_price)}</td><td>{money(item.total_price)}</td></tr>)}</tbody><tfoot><tr><td colSpan="7">Grand Total</td><td>{money(row.grand_total)}</td></tr></tfoot></table></div></DetailSection>
    <footer><span>Created By<br/><b>{row.created_by||"Calculator"}</b></span><span>Created At<br/><b>{new Date(row.created_at).toLocaleString()}</b></span><span>Last Updated<br/><b>{new Date(row.updated_at).toLocaleString()}</b></span></footer>
  </aside>;
}
function DetailSection({title,badge,children}){return <section className="quotation-detail-section"><h3>{title}{badge?<span>{badge}</span>:null}</h3>{children}</section>}
