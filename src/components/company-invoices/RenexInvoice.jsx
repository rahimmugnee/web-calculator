import { forwardRef } from "react";
import { toBDT } from "../../lib/calc.js";
import "./RenexInvoice.css";

const RenexInvoice = forwardRef(function RenexInvoice({
  customer,
  dateStr,
  display,
  items,
  model,
  refNo,
  rows,
  totals,
  company,
  showDiscountBlock,
}, ref) {
  const sizeStr = `${display.widthFt || "—"}ft × ${display.heightFt || "—"}ft`;
  const grandTotal = showDiscountBlock ? (totals.payable ?? totals.grandTotal) : totals.grandTotal;

  return (
    <article ref={ref} className="renex-quotation-document">
      <div className="renex-quotation-body">
        <header className="renex-quotation-heading">
          <h1>QUOTATION</h1>
          <div>
            <span><b>Date:</b> {dateStr}</span>
            <span><b>Ref:</b> {refNo}</span>
          </div>
        </header>

        <section className="renex-client-box">
          <h2>Client Details</h2>
          <div className="renex-client-grid">
            <div><b>Name:</b><span>{customer.name || "—"}</span></div>
            <div><b>Designation:</b><span>{customer.position || "—"}</span></div>
            <div><b>Organization Name:</b><span>{customer.company || "—"}</span></div>
            <div><b>Mobile Number:</b><span>{customer.mobile || "—"}</span></div>
            <div className="renex-client-address"><b>Address:</b><span>{customer.address || "—"}</span></div>
          </div>
        </section>

        <div className="renex-proposal-title">
          Quotation for: {model.name} {items.dispType === "outdoor" ? "Outdoor" : "Indoor"} ({items.technology?.toUpperCase()}) LED Display. ({sizeStr}) | Sft: ({display.sft || "—"})
        </div>

        <div className="renex-line-items">
          {rows.map((row) => (
            <div className="renex-line-item" key={row.sl}>
              <div className="renex-item-sl">{row.sl}</div>
              <div className="renex-item-copy">
                {row.type === "package" ? row.packageLines.map((line, index) => (
                  <div key={`${row.sl}-${index}`}>
                    <strong>{line.text}</strong>
                    {line.brand ? <small>Brand: {line.brand}</small> : null}
                  </div>
                )) : (
                  <>
                    <strong>{row.name}</strong>
                    <small>
                      {row.qty} {row.unit} &nbsp;•&nbsp; Unit: {toBDT(row.unitPrice)}
                      {row.brand ? <> &nbsp;•&nbsp; Brand: {row.brand}</> : null}
                    </small>
                  </>
                )}
              </div>
              <div className="renex-item-total">{toBDT(row.total)}</div>
            </div>
          ))}
        </div>

        {totals?.vatEnabled ? (
          <div className="renex-totals renex-totals-multi">
            <div><b>Subtotal =</b><strong>{toBDT(totals.totalBeforeVat)}</strong></div>
            <div><b>VAT ({Math.round((totals.vatRate || 0.1) * 100)}%) =</b><strong>{toBDT(totals.vatAmount)}</strong></div>
            <div><b>Grand Total =</b><strong>{toBDT(totals.grandTotal)}</strong></div>
            {showDiscountBlock ? <><div><b>Special Discount =</b><strong>{toBDT(totals.discount || 0)}</strong></div><div><b>Payable =</b><strong>{toBDT(grandTotal)}</strong></div></> : null}
          </div>
        ) : (
          <div className="renex-totals">
            <b>Grand Total =</b><strong>{toBDT(grandTotal)}</strong>
          </div>
        )}

        <div className="renex-signatory">
          <b>Sincerely</b>
          <div className="renex-sign-images">
            <img src={company?.assets?.signature || "/Renex/signature.png"} alt="Authorized Signature" />
            <img src={company?.assets?.seal || "/Renex/seal.png"} alt="Company Seal" />
          </div>
          <strong>{company?.signatory_name || "Sharif Uddin"}</strong>
          <span>{company?.signatory_designation || "Chief Technology Officer"}</span>
          <span>{company?.signatory_company_name || "Renex Digital"}</span>
          <span>Cell: {company?.signatory_phone || "+8801600-007242"}</span>
          <span>E-mail: {company?.signatory_email || "sharif.renex@gmail.com"}</span>
        </div>
      </div>
    </article>
  );
});

export default RenexInvoice;
