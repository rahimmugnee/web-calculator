import { forwardRef } from "react";
import { bdtToWords, toBDT } from "../../lib/calc.js";
import "./SashaInvoice.css";

const SashaInvoice = forwardRef(function SashaInvoice({
  customer, dateStr, display, items, model, refNo, rows, totals, company, showDiscountBlock,
}, ref) {
  const detailRows = rows.filter((row) => !/Structure & Accessories|Installation, Testing & Commissioning|Transport Cost/i.test(row.name || ""));
  const extraRows = rows.filter((row) => /Structure & Accessories|Installation, Testing & Commissioning|Transport Cost/i.test(row.name || ""));
  const displayTotal = detailRows.reduce((sum, row) => sum + Number(row.total || 0), 0);
  const area = Number(display.sft) || 0;
  const displayUnitPrice = area > 0 ? Math.round(displayTotal / area) : displayTotal;
  const payable = showDiscountBlock ? (totals.payable ?? totals.grandTotal) : totals.grandTotal;
  const controllerRow = detailRows.find((row) => /controller/i.test(row.name || ""));
  const receivingRow = detailRows.find((row) => /receiving/i.test(row.name || ""));
  const powerRow = detailRows.find((row) => /power supply/i.test(row.name || ""));
  const moduleRow = detailRows[0];

  return (
    <article ref={ref} className="sasha-quotation-document">
      <div className="sasha-quotation-body">
        <header className="sasha-ref-row">
          <span><b>Ref:</b> {refNo}</span>
          <span><b>Date:</b> {dateStr}</span>
        </header>

        <section className="sasha-client-box">
          <h2>Client Details</h2>
          <div className="sasha-client-grid">
            <div><b>Name:</b><span>{customer?.name || "—"}</span></div>
            <div><b>Designation:</b><span>{customer?.position || "—"}</span></div>
            <div><b>Organization Name:</b><span>{customer?.company || "—"}</span></div>
            <div><b>Mobile Number:</b><span>{customer?.mobile || "—"}</span></div>
            <div className="sasha-client-address"><b>Address:</b><span>{customer?.address || "—"}</span></div>
          </div>
        </section>

        <div className="sasha-proposal-title">
          Quotation for {model.name} {items.dispType === "outdoor" ? "Outdoor" : "Indoor"} ({items.technology?.toUpperCase()}) LED Display. ({display.widthFt || "—"}ft x {display.heightFt || "—"}ft)
        </div>

        <table className="sasha-invoice-table">
          <colgroup><col className="sasha-col-sl"/><col/><col className="sasha-col-unit"/><col className="sasha-col-qty"/><col className="sasha-col-price"/><col className="sasha-col-total"/></colgroup>
          <thead><tr><th>SL.</th><th>Item Name</th><th>Unit</th><th>Qty</th><th>Unit Price Tk</th><th>Total Price Tk</th></tr></thead>
          <tbody>
            <tr className="sasha-system-row">
              <td>1</td>
              <td>
                <strong>{model.name} {items.dispType === "outdoor" ? "Outdoor" : "Indoor"} ({items.technology?.toUpperCase()}) LED Display</strong>
                <span>Module Brand: {moduleRow?.brand || items.brands?.module || "—"}</span>
                {controllerRow ? <><span>Controller Model: {String(controllerRow.name || "").replace(/^Controller:\s*/i, "")}</span><span>Controller Brand: {controllerRow.brand || items.brands?.controller || "—"}</span></> : null}
                {receivingRow ? <><span>Receiving Card Model: {String(receivingRow.name || "").replace(/^Receiving Card:\s*/i, "")}</span><span>Brand: {receivingRow.brand || items.brands?.receiving || "—"}</span></> : null}
                {powerRow ? <span>Power Supply Brand: {powerRow.brand || items.brands?.psu || "—"}</span> : null}
              </td>
              <td>{area ? "Sqft" : moduleRow?.unit || "Set"}</td>
              <td>{area || moduleRow?.qty || 1}</td>
              <td>{toBDT(displayUnitPrice)}</td>
              <td>{toBDT(displayTotal)}</td>
            </tr>
            {extraRows.map((row, index) => <tr key={row.sl}><td>{index + 2}</td><td><strong>{row.name}</strong></td><td>{row.unit}</td><td>{row.qty}</td><td>{toBDT(row.unitPrice)}</td><td>{toBDT(row.total)}</td></tr>)}
            <tr className="sasha-grand-row"><td colSpan="5">Grand Total =</td><td>{toBDT(payable)}</td></tr>
          </tbody>
        </table>

        <div className="sasha-in-words"><b>In Words:</b> <i>{bdtToWords(payable)}</i></div>

        <div className="sasha-signatory">
          <span className="sasha-sincerely">Sincerely</span>
          <div className="sasha-sign-images"><img src={company?.assets?.signature || "/Sasha/signature.png"} alt="Authorized Signature"/><img src={company?.assets?.seal || "/Sasha/seal.png"} alt="Company Seal"/></div>
          <strong>{company?.signatory_name || "Abdur Rahim"}</strong>
          <em>{company?.signatory_designation || "Sub Assistant Engineer"}</em>
          <span>{company?.signatory_company_name || "Sasha Corporation"}</span>
          <span>Cell: {company?.signatory_phone || "+8801608843419"}</span>
          <span>E-mail: {company?.signatory_email || "rahim@sashabd.com"}</span>
        </div>
      </div>
    </article>
  );
});

export default SashaInvoice;
