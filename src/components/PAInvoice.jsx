import { forwardRef, useMemo } from "react";
import { toBDT, bdtToWords, generateRef } from "../lib/calc.js";

// Brands that aren't a real product manufacturer for this row (generic
// accessory bundles, the in-house installation service) don't need their
// brand/model spelled out in the invoice's Brand/Model column.
function formatBrandModel(row) {
  if (row.brand === "Mugnee Multiple Limited") return "-";
  if (row.brand === "Generic") return row.brand;
  return [row.brand, row.model].filter(Boolean).join(" / ") || "-";
}

const PAInvoice = forwardRef(function PAInvoice({ calc, snapshot, orderDate = new Date(), quotationRef, company }, ref) {
  const fallbackRef = useMemo(() => generateRef(), []);
  const refNo = quotationRef ?? fallbackRef;
  const rows = calc?.rows || [];
  const totals = calc?.totals || {};
  const customer = snapshot?.customer || {};
  const projectDetails = snapshot?.projectDetails || {};

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(orderDate);

  const systemLabel = snapshot?.paInstallationType === "ip" ? "IP PA System" : "Wired PA System";
  const showDiscountBlock = Boolean(snapshot?.discountEnabled);

  // Separate totals table (SUBTOTAL/VAT rows only when VAT is on; the final
  // row — GRAND TOTAL, or PAYABLE if a discount applies — gets the dark
  // highlight style).
  const totalRows = [];
  if (totals.vatEnabled) {
    totalRows.push({ label: "SUBTOTAL", value: totals.totalBeforeVat });
    totalRows.push({ label: `VAT (${Math.round((totals.vatRate || 0.15) * 100)}%)`, value: totals.vatAmount });
  }
  if (showDiscountBlock) {
    totalRows.push({ label: "GRAND TOTAL (BDT)", value: totals.grandTotal });
    totalRows.push({ label: "SPECIAL DISCOUNT", value: totals.discount || 0 });
    totalRows.push({ label: "PAYABLE (BDT)", value: totals.payable ?? totals.grandTotal, final: true });
  } else {
    totalRows.push({ label: "GRAND TOTAL (BDT)", value: totals.grandTotal, final: true });
  }

  return (
    <div ref={ref}>
      <div className="ref-row tidy">
        <div className="ref-left">
          <strong>Ref:</strong> {refNo}
        </div>
        <div className="ref-right">
          <strong>Date:</strong> {dateStr}
        </div>
      </div>

      <div className="pa-header-grid">
        <div className="pa-to-box">
          <div className="pa-ribbon">TO</div>
          <div className="pa-to-lines">
            <strong>{customer.company || "-"}</strong>
            <div>Attn: {customer.name || "-"}</div>
            <div>Designation: {customer.position || "-"}</div>
            <div>Phone: {customer.mobile || "-"}</div>
            <div>Email: {customer.email || "-"}</div>
            <div>Address: {customer.address || "-"}</div>
          </div>
        </div>

        <div className="pa-project-box">
          <div className="pa-ribbon">PROJECT DETAILS</div>
          <div className="pa-project-lines">
            <div>
              <span>Project Name</span>
              <b>:</b>
              <strong>{projectDetails.name || "-"}</strong>
            </div>
            <div>
              <span>Project Location</span>
              <b>:</b>
              <strong>{projectDetails.location || "-"}</strong>
            </div>
            <div>
              <span>Project Type</span>
              <b>:</b>
              <strong>{projectDetails.type || "-"}</strong>
            </div>
            <div>
              <span>Prepared By</span>
              <b>:</b>
              <strong>{projectDetails.preparedBy || "-"}</strong>
            </div>
          </div>
        </div>
      </div>

      <div className="invoice-panel">
        <div className="price-title">
          <div className="price-title-left">
            <strong>
              Proposal For {systemLabel} <span className="tech-badge">({snapshot?.applicationType || "-"})</span>
            </strong>
          </div>
        </div>

        <table className="table invoice-table pa-invoice-table">
          <colgroup>
            <col className="col-sl" />
            <col className="col-item" />
            <col className="col-brand-model" />
            <col className="col-unit" />
            <col className="col-qty" />
            <col className="col-unit-price" />
            <col className="col-total-price" />
          </colgroup>
          <thead>
            <tr>
              <th className="td-center">SL.</th>
              <th className="td-center">Item Description</th>
              <th className="td-center">Brand / Model</th>
              <th className="td-center">Unit</th>
              <th className="td-center">Qty</th>
              <th className="td-center">Unit Price ৳</th>
              <th className="td-center">Total Price ৳</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id || row.sl}>
                <td className="td-center">{row.sl}</td>
                <td>
                  <div className="item-name">{row.name}</div>
                </td>
                <td className="td-center">{formatBrandModel(row)}</td>
                <td className="td-center">{row.unit || "-"}</td>
                <td className="td-center">{row.qty}</td>
                <td className="td-right">{toBDT(row.unitPrice)}</td>
                <td className="td-right">{toBDT(row.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="pa-totals-wrap">
          <table className="pa-totals-table">
            <tbody>
              {totalRows.map((row) => (
                <tr key={row.label} className={row.final ? "pa-grand-row" : undefined}>
                  <th>{row.label}</th>
                  <td>{toBDT(row.value)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="in-words">
          <b>In Words:</b>{" "}
          <span className="in-words-value">
            {bdtToWords(showDiscountBlock ? totals.payable ?? totals.grandTotal : totals.grandTotal)}
          </span>
        </div>

        <div className="signatures lift pa-signatures">
          <div className="sig-left">
            <div className="sig-block">
              <div className="sig-title">Sincerely</div>
              <img src={company?.assets?.signature || "/Mugnee-Multiple-Limited/signature.png"} alt="Authorized Signature" className="sign-img" />
              <div className="profile-name">
                <span className="name">{company?.signatory_name || "Saiful Islam Shajib"}</span>
                <span className="role">{company?.signatory_designation || "Chief Executive Officer"}</span>
                <span>{company?.signatory_company_name || "Mugnee Multiple Limited"}</span>
                <span>Cell: {company?.signatory_phone || "+8801711-927445"}</span>
                <span>E-mail: {company?.signatory_email || "mugnee.multiple@gmail.com"}</span>
              </div>
            </div>
            <img src={company?.assets?.seal || "/Mugnee-Multiple-Limited/seal.png"} alt="Company Seal" className="seal-img" />
          </div>

          <div className="pa-ack-box">
            <div className="pa-ribbon">CUSTOMER ACKNOWLEDGEMENT</div>
            <p className="pa-ack-text">
              I/We hereby confirm that we have read and understood the terms &amp; conditions mentioned in this
              quotation.
            </p>
            <div className="pa-ack-fields">
              <div className="pa-ack-row">
                <div className="pa-ack-field">
                  <span>Name</span>
                  <b>:</b>
                  <span className="fill-line" />
                </div>
                <div className="pa-ack-field">
                  <span>Designation</span>
                  <b>:</b>
                  <span className="fill-line" />
                </div>
              </div>
              <div className="pa-ack-field pa-ack-full">
                <span>Company</span>
                <b>:</b>
                <span className="fill-line" />
              </div>
              <div className="pa-ack-row">
                <div className="pa-ack-field">
                  <span>Signature</span>
                  <b>:</b>
                  <span className="fill-line" />
                </div>
                <div className="pa-ack-field">
                  <span>Date</span>
                  <b>:</b>
                  <span className="fill-line" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default PAInvoice;
