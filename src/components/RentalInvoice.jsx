import { forwardRef, useMemo } from "react";
import { bdtToWords, generateRef, toBDT } from "../lib/calc.js";

const RentalInvoice = forwardRef(function RentalInvoice({ calc, snapshot, orderDate = new Date(), quotationRef, company }, ref) {
  const rows = calc?.rows || [];
  const totals = calc?.totals || {};
  const customer = snapshot?.customer || {};
  const fallbackRef = useMemo(() => generateRef(), []);
  const refNo = quotationRef ?? fallbackRef;
  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(orderDate);

  return (
    <div ref={ref} className="rental-quotation">
      <div className="rental-header-row">
        <div className="rental-to-box">
          <div className="rental-ribbon">TO</div>
          <div className="rental-info-lines">
            <div><span>Company Name</span><b>:</b><strong>{customer.company || "-"}</strong></div>
            <div><span>Attention</span><b>:</b><strong>{customer.name || "-"}</strong></div>
            <div><span>Designation</span><b>:</b><strong>{customer.position || "-"}</strong></div>
            <div><span>Project / Event</span><b>:</b><strong>{customer.projectEvent || "-"}</strong></div>
            <div><span>Venue</span><b>:</b><strong>{customer.venue || "-"}</strong></div>
            <div><span>Event Date</span><b>:</b><strong>{customer.eventDate || "-"}</strong></div>
          </div>
        </div>

        <div className="rental-meta-box">
          <h1>QUOTATION</h1>
          <table>
            <tbody>
              <tr><th>Quotation No.</th><td>{refNo}</td></tr>
              <tr><th>Date</th><td>{dateStr}</td></tr>
              <tr><th>Validity</th><td>3 Days</td></tr>
              <tr><th>Prepared By</th><td>Mugnee Multiple Limited</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="rental-subject">
        <span>Subject:</span>
        <strong>Quotation For P3 Rental LED Display, Sound System &amp; Technical Support</strong>
      </div>

      <div className="rental-letter">
        <p>Dear Sir/Madam,</p>
	        <p>
	          Thank you very much for your kind inquiry. We are pleased to submit our best commercial offer for
	          <b> Rental LED Display, Sound System &amp; Technical Support </b>
	          as per your requirement. Please find the details of our proposal below:
	        </p>
	      </div>

      <div className="rental-section-title">COMMERCIAL PROPOSAL</div>

      <table className="table invoice-table rental-table">
        <colgroup>
          <col className="col-sl" />
          <col className="col-item" />
          <col className="col-qty" />
          <col className="col-unit" />
          <col className="col-unit-price" />
          <col className="col-duration" />
          <col className="col-total-price" />
        </colgroup>
        <thead>
          <tr>
            <th className="td-center">SL.</th>
            <th className="td-center">Description</th>
            <th className="td-center">Qty</th>
            <th className="td-center">Unit</th>
            <th className="td-center">Rate (BDT)</th>
            <th className="td-center">Duration</th>
            <th className="td-center">Amount (BDT)</th>
          </tr>
        </thead>
        <tbody>
	          {rows.map((row) => (
	            <tr key={row.sl} className={row.className || ""}>
              <td className="td-center">{row.sl}</td>
	              <td>
	                <div className="item-name">{row.name}</div>
	                {Array.isArray(row.detailLines) && row.detailLines.length ? (
	                  <div className="item-brand rental-detail-lines">
	                    {row.detailLines.map((line, index) => (
	                      <div key={`${row.sl}-detail-${index}`}>{line}</div>
	                    ))}
	                  </div>
	                ) : row.detail ? (
	                  <div className="item-brand">{row.detail}</div>
	                ) : null}
	              </td>
	              <td className="td-center">{row.qty}</td>
	              <td className="td-center">{row.unit}</td>
	              <td className="td-center">{row.included ? "-" : toBDT(row.rate)}</td>
	              <td className="td-center">{row.duration}</td>
	              <td className={row.included ? "td-center" : "td-right"}>{row.included ? "Included" : toBDT(row.amount)}</td>
	            </tr>
	          ))}
        </tbody>
      </table>

      <div className="rental-bottom-grid">
        <table className="rental-total-table">
          <tbody>
            {totals.vatEnabled ? <tr><th>SUBTOTAL</th><td>{toBDT(totals.subTotal)}</td></tr> : null}
            {totals.vatEnabled ? <tr><th>VAT (15%)</th><td>{toBDT(totals.vatAmount)}</td></tr> : null}
            <tr className="grand"><th>GRAND TOTAL (BDT)</th><td>{toBDT(totals.grandTotal)}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="in-words rental-words">
        <b>In Words:</b> <span className="in-words-value">{bdtToWords(totals.grandTotal)}</span>
      </div>

      <div className="rental-signature">
        <div>For {company?.signatory_company_name || "Mugnee Multiple Limited"}</div>
        <img src={company?.assets?.signature || "/Mugnee-Multiple-Limited/signature.png"} alt="Authorized Signature" />
        <strong>{company?.signatory_name || "Authorized Signature"}</strong>
        <span>{company?.signatory_designation || company?.signatory_company_name || "Mugnee Multiple Limited"}</span>
      </div>
    </div>
  );
});

export default RentalInvoice;
