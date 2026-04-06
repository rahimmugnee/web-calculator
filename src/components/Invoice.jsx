// ===============================
// src/components/Invoice.jsx
// ===============================
import { forwardRef, useMemo } from "react";
import { toBDT, bdtToWords, generateRef } from "../lib/calc.js";
import { CONTROLLERS } from "../data/models.js";

const Invoice = forwardRef(function Invoice({ calc, snapshot, orderDate = new Date(), quotationRef }, ref) {
  const { model, customer, display, items, tier } = snapshot;
  const { totals, unitPrices } = calc;

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(orderDate);

  const fallbackRef = useMemo(() => generateRef(), []);
  const refNo = quotationRef ?? fallbackRef;

  const unitModule = unitPrices?.unitModule ?? 0;
  const unitCtrl = unitPrices?.unitCtrl ?? (items.controllerPrice ?? 0);
  const unitRC = unitPrices?.unitRC ?? 0;
  const unitPS = unitPrices?.unitPS ?? 0;

  // ✅ Cabinet unit price (from calc.js)
  const unitCabinet = unitPrices?.unitCabinet ?? 0;

  const sizeStr = `${display.widthFt || "—"}ft × ${display.heightFt || "—"}ft`;

  // controller label human-readable (Huidu + Novastar)
  const controllerLabel =
    items?.controllerLabel ||
    (items?.controllerId
      ? CONTROLLERS.find((c) => c.id === items.controllerId)?.label || items.controllerId.replace(/^NS_/, "")
      : "");

  // ---- Dynamic rows (SL auto) ----
  const rows = [];
  let sl = 1;

  // ✅ Module (NO Technology here)
  rows.push({
    sl: sl++,
    name: `Module: ${model.name} LED Display Module`,
    unit: "Pcs",
    qty: items.modulesQty,
    unitPrice: unitModule,
    total: totals.totalModules,
    brand: items.brands?.module,
  });

  // Controller – only when qty>0 and id exists
  if (items.controllerQty > 0 && items.controllerId) {
    rows.push({
      sl: sl++,
      name: controllerLabel,
      unit: "Pcs",
      qty: items.controllerQty,
      unitPrice: unitCtrl,
      total: totals.controllerTotal,
      brand: items.brands?.controller,
    });
  }

  // Receiving card
  const rcLabel = items.receivingPicked?.label || "Receiving Card";
  rows.push({
    sl: sl++,
    name: rcLabel,
    unit: "Pcs",
    qty: items.rcQty,
    unitPrice: unitRC,
    total: totals.totalRC,
    brand: items.brands?.receiving,
  });

  // Power supply
  rows.push({
    sl: sl++,
    name: "Power Supply",
    unit: "Pcs",
    qty: items.psQty,
    unitPrice: unitPS,
    total: totals.totalPS,
    brand: items.brands?.psu,
  });

  // ✅ Cabinet Case (only when cabinet enabled) — must be under Power Supply
  if (items?.cabinetEnabled && (items?.cabinetQty || 0) > 0) {
    rows.push({
      sl: sl++,
      name: " Die Cast Aluminum Cabinet (640 × 480)mm",
      unit: "Pcs",
      qty: items.cabinetQty,
      unitPrice: unitCabinet,
      total: totals.totalCabinet || 0,
    });
  }

  // Structure & Accessories (if any)
  if (totals.accessories) {
    rows.push({
      sl: sl++,
      name: "Structure & Accessories",
      unit: "Lot",
      qty: 1,
      unitPrice: unitPrices?.accessories ?? totals.accessories,
      total: totals.accessories,
    });
  }

  // Installation
  rows.push({
    sl: sl++,
    name: "Installation, Testing & Commissioning",
    unit: "Make",
    qty: 1,
    unitPrice: totals.installation,
    total: totals.installation,
  });

  // ✅ Note should show only for Outdoor
  const showOutdoorNote = items?.dispType === "outdoor";

  // ✅ Quality label
  const qualityLabel = tier?.label || "Gold";

  const showDiscountBlock = !!snapshot?.discountEnabled; // only when enabled

  return (
    <div ref={ref}>
      {/* Ref + Date */}
      <div className="ref-row tidy">
        <div className="ref-left">
          <strong>Ref:</strong> {refNo}
        </div>
        <div className="ref-right">
          <strong>Date:</strong> {dateStr}
        </div>
      </div>

      {/* Customer box */}
      <div className="info-box">
        <div className="info-title">To</div>

        <div className="info-grid">
          <div>
            <span>Name:</span> {customer.name || "—"}
          </div>

          <div>
            <span>Designation:</span> {customer.position || "—"}
          </div>

          <div>
            <span>Organization Name:</span> {customer.company || "—"}
          </div>

          <div>
            <span>Mobile Number:</span> {customer.mobile || "—"}
          </div>

          {/* ✅ Address (FULL WIDTH, natural wrapping) */}
          <div className="info-line info-full">
            <span className="info-label">Address:</span>
            <span className="info-value">{customer.address || "—"}</span>
          </div>
        </div>
      </div>

      {/* Invoice content panel */}
      <div className="invoice-panel">
        <div className="price-title">
          <div className="price-title-left">
            <strong>
              {model.name} <span className="tech-badge"> ({items.technology?.toUpperCase()})</span> LED Display. ({sizeStr}) |
            </strong>

            <span className="sft-cal"> Sft:</span>{" "}
            <span className="sft-cal-">({display.sft || "—"}) </span>
          </div>

          {/* ✅ এখানে Warranty বাদ, শুধু Quality দেখাবে */}
          <div className={`tier-badge ${tier?.id || "gold"}`} title={`Quality: ${qualityLabel}`}>
            Quality: {qualityLabel}
          </div>
        </div>

        <table className="table invoice-table">
          <thead>
            <tr>
              <th style={{ width: 10 }} className="td-center">
                SL.
              </th>
              <th className="td-center">Item Name</th>
              <th style={{ width: 20 }} className="td-center">
                Unit
              </th>
              <th style={{ width: 20 }} className="td-center">
                Qty
              </th>
              <th style={{ width: 70 }} className="td-center">
                Unit Price ৳
              </th>
              <th style={{ width: 80 }} className="td-center">
                Total Price ৳
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.sl} className={r.className || ""}>
                <td className="td-center">{r.sl}</td>
                <td>
                  <div className="item-name">{r.name}</div>
                  {r.brand ? <div className="item-brand">Brand: {r.brand}</div> : null}
                </td>
                <td className="td-center">{r.unit}</td>
                <td className="td-center">{r.qty}</td>
                <td className="td-right">{toBDT(r.unitPrice)}</td>
                <td className="td-right">{toBDT(r.total)}</td>
              </tr>
            ))}

            {/* ✅ VAT ON হলে: Total + VAT + Grand Total দেখাবে */}
            {totals?.vatEnabled ? (
              <>
                <tr className="row-accent">
                  <td colSpan={5} className="td-right total-big">
                    Total =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.totalBeforeVat)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={5} className="td-right total-big">
                    Vat ({Math.round((totals.vatRate || 0.1) * 100)}%) =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.vatAmount)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={5} className="td-right total-big">
                    Grand Total =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.grandTotal)}</td>
                </tr>
              </>
            ) : (
              <tr className="row-accent">
                <td colSpan={5} className="td-right total-big">
                  Grand Total =
                </td>
                <td className="td-right total-big">{toBDT(totals.grandTotal)}</td>
              </tr>
            )}

            {/* ✅ Discount block (ONLY when enabled) */}
            {showDiscountBlock ? (
              <>
                <tr className="row-accent">
                  <td colSpan={5} className="td-right total-big">
                    Special Discount =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.discount || 0)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={5} className="td-right total-big">
                    Payable =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.payable ?? totals.grandTotal)}</td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>

        <div className="in-words">
          <b>In Words:</b>{" "}
          {bdtToWords(showDiscountBlock ? (totals.payable ?? totals.grandTotal) : totals.grandTotal)}
        </div>

        {/* ✅ Note shows only when Outdoor selected */}
        {showOutdoorNote ? (
          <div className="quote-note">
            <span className="label">[Note:</span>
            The above-mentioned quoted amount is excluding all civil works, GI pipes, and the main electrical line.
            <span className="label">]</span>
          </div>
        ) : null}

        {/* ✅ seal/signature */}
        <div className="signatures lift">
          <div className="sig-block">
            <div className="sig-title">Sincerely</div>

            <img src="/signature.png" alt="Authorized Signature" className="sign-img" />

            <div className="profile-name">
              <span className="name">Saiful Islam Shajib</span>
              <span className="role">Chief Executive Officer</span>

              <span> Mugnee Multiple Limited</span>
              <span>Cell: +8801711-927445</span>
              <span>E-mail: mugnee.multiple@gmail.com</span>
            </div>
          </div>

          <img src="/seal.png" alt="Company Seal" className="seal-img" />
        </div>
      </div>
    </div>
  );
});

export default Invoice;
