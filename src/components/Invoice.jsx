// ===============================
// src/components/Invoice.jsx
// ===============================
import { forwardRef, useMemo } from "react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { toBDT, bdtToWords, generateRef } from "../lib/calc.js";
import RentalInvoice from "./RentalInvoice.jsx";
import PAInvoice from "./PAInvoice.jsx";
import ConferenceInvoice from "./ConferenceInvoice.jsx";
import RenexInvoice from "./company-invoices/RenexInvoice.jsx";
import SashaInvoice from "./company-invoices/SashaInvoice.jsx";

const componentModelName = (value = "") => String(value)
  .replace(/^(?:Controller|Receiving Card|Video Processor)\s*:\s*/i, "")
  .trim();

const Invoice = forwardRef(function Invoice({ calc, snapshot, orderDate = new Date(), quotationRef }, ref) {
  const { catalog, company } = useCatalog();
  const fallbackRef = useMemo(() => generateRef(), []);

  if (snapshot?.quotationType === "rental") {
    return <RentalInvoice ref={ref} calc={calc} snapshot={snapshot} orderDate={orderDate} quotationRef={quotationRef} company={company} />;
  }

  if (snapshot?.quotationType === "pa") {
    return <PAInvoice ref={ref} calc={calc} snapshot={snapshot} orderDate={orderDate} quotationRef={quotationRef} company={company} />;
  }

  if (snapshot?.quotationType === "conference") {
    return <ConferenceInvoice ref={ref} calc={calc} snapshot={snapshot} orderDate={orderDate} quotationRef={quotationRef} company={company} />;
  }
  const { model, customer, display, items, tier } = snapshot;
  const { totals, unitPrices } = calc;

  const dateStr = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  }).format(orderDate);

  const refNo = quotationRef ?? fallbackRef;

  const unitModule = unitPrices?.unitModule ?? 0;
  const unitCtrl = unitPrices?.unitCtrl ?? (items.controllerPrice ?? 0);
  const unitRC = unitPrices?.unitRC ?? 0;
  const unitPS = unitPrices?.unitPS ?? 0;
  const unitTransport = unitPrices?.transport ?? 0;
  const unitCustomItem = unitPrices?.customItem ?? 0;

  // ✅ Cabinet unit price (from calc.js)
  const unitCabinet = unitPrices?.unitCabinet ?? 0;
  const isIrregular = snapshot?.quotationMode === "irregular";
  const irregularQty = Math.max(1, Math.ceil(Number(snapshot?.irregular?.qty) || 1));
  const moduleModelName = model.code || model.name;
  const cabinetText = items?.cabinetEnabled
    ? `${items?.cabinet?.invoiceLabel || "Aluminium Cabinet"} (${items?.cabinet?.sizeLabel || "640 x 480mm"})`
    : "Cabinet";

  const sizeStr = `${display.widthFt || "—"}ft × ${display.heightFt || "—"}ft`;

  // controller label human-readable (Huidu + Novastar)
  const controllerLabel =
    items?.controllerLabel ||
    (items?.controllerId
      ? catalog.controllers.find((c) => c.id === items.controllerId)?.label || items.controllerId.replace(/^NS_/, "")
      : "");

  // ---- Dynamic rows (SL auto) ----
  const rows = [];
  let sl = 1;

  // ✅ Module (NO Technology here)
  const rcLabel = items.receivingPicked?.label || "Receiving Card";

  if (isIrregular) {
    rows.push({
      sl: sl++,
      type: "package",
      unit: snapshot?.irregular?.unit || "Set",
      qty: irregularQty,
      unitPrice: totals.ledSetUnitTotal || 0,
      total: (totals.ledSetUnitTotal || 0) * irregularQty,
      packageLines: [
        { name: "LED Display Module", brand: items.brands?.module, model: moduleModelName },
        { name: "Power Supply", brand: items.brands?.psu, model: items.psuPicked?.label || items.psuPicked?.model || "" },
        { name: "Receiving Card", brand: items.brands?.receiving, model: componentModelName(rcLabel) },
        ...(items?.cabinetEnabled ? [{ name: "Cabinet", model: cabinetText }] : []),
      ],
    });
  } else {
    rows.push({
      sl: sl++,
      name: "LED Display Module",
      model: moduleModelName,
      unit: "Pcs",
      qty: items.modulesQty,
      unitPrice: unitModule,
      total: totals.totalModules,
      brand: items.brands?.module,
    });
  }

  // Controller – only when qty>0 and id exists
  if (items.controllerQty > 0 && items.controllerId) {
    rows.push({
      sl: sl++,
      name: "Controller",
      model: componentModelName(controllerLabel),
      unit: "Pcs",
      qty: items.controllerQty,
      unitPrice: unitCtrl,
      total: totals.controllerTotal,
      brand: items.brands?.controller,
    });
  }

  // Receiving card
  if (!isIrregular) {
    rows.push({
      sl: sl++,
      name: "Receiving Card",
      model: componentModelName(rcLabel),
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
      model: items.psuPicked?.label || items.psuPicked?.model || "",
      unit: "Pcs",
      qty: items.psQty,
      unitPrice: unitPS,
      total: totals.totalPS,
      brand: items.brands?.psu,
    });
  }

  // ✅ Cabinet Case (only when cabinet enabled) — must be under Power Supply
  if (!isIrregular && items?.cabinetEnabled && (items?.cabinetQty || 0) > 0) {
    rows.push({
      sl: sl++,
      name: "Cabinet",
      model: cabinetText,
      unit: "Pcs",
      qty: items.cabinetQty,
      unitPrice: unitCabinet,
      total: totals.totalCabinet || 0,
    });
  }

  const customItems = items?.customItems?.length
    ? items.customItems
    : items?.customItem?.enabled
    ? [items.customItem]
    : [];
  customItems.forEach((item, index) => {
    const price = unitPrices?.customItems?.[index] ?? (customItems.length === 1 ? unitCustomItem : Number(item.price) || 0);
    rows.push({
      sl: sl++,
      name: item.name || "Custom Item",
      unit: "Pcs",
      qty: 1,
      unitPrice: price,
      total: price,
    });
  });

  // Structure & Accessories (if any)
  if (totals.accessories) {
    rows.push({
      sl: sl++,
      name: "Structure & Accessories",
      unit: "Lot",
      qty: isIrregular ? irregularQty : 1,
      unitPrice: totals.accessoriesUnit ?? unitPrices?.accessories ?? totals.accessories,
      total: totals.accessories,
    });
  }

  // Installation
  rows.push({
    sl: sl++,
    name: "Installation, Testing & Commissioning",
    unit: "Make",
    qty: isIrregular ? irregularQty : 1,
    unitPrice: totals.installationUnit ?? totals.installation,
    total: totals.installation,
  });

  if (snapshot?.transport?.enabled) {
    rows.push({
      sl: sl++,
      name: "Transport Cost",
      unit: "Lot",
      qty: 1,
      unitPrice: unitTransport,
      total: totals.transport || 0,
    });
  }

  // ✅ Note should show only for Outdoor
  const showOutdoorNote = items?.dispType === "outdoor";

  // ✅ Quality label
  const qualityLabel = tier?.label || "Gold";

  const showDiscountBlock = !!snapshot?.discountEnabled; // only when enabled

  if (String(company?.code || "").toLowerCase() === "renex") {
    return <RenexInvoice ref={ref} customer={customer} dateStr={dateStr} display={display} items={items} model={model} refNo={refNo} rows={rows} totals={totals} company={company} showDiscountBlock={showDiscountBlock} />;
  }
  if (String(company?.code || "").toLowerCase() === "sasha") {
    return <SashaInvoice ref={ref} customer={customer} dateStr={dateStr} display={display} items={items} model={model} refNo={refNo} rows={rows} totals={totals} company={company} showDiscountBlock={showDiscountBlock} />;
  }

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
        <div className="info-header">
          <div className="info-title">To</div>
        </div>

        <div className="info-grid">
          <div>
            <span className="info-label">Name:</span> {customer.name || "—"}
          </div>

          <div>
            <span className="info-label">Designation:</span> {customer.position || "—"}
          </div>

          <div>
            <span className="info-label">Organization Name:</span> {customer.company || "—"}
          </div>

          <div>
            <span className="info-label">Mobile Number:</span> {customer.mobile || "—"}
          </div>

          {/* ✅ Address (FULL WIDTH, natural wrapping) */}
          <div className="info-line info-full address-line">
            <span className="info-label">Address:</span>
            <span className="info-value info-address-value">{customer.address || "—"}</span>
            <span className={`tier-badge info-tier-badge info-quality-inline ${tier?.id || "gold"}`} title={`Quality: ${qualityLabel}`}>
              Quality: {qualityLabel}
            </span>
          </div>
        </div>
      </div>

      {/* Invoice content panel */}
      <div className="invoice-panel">
        <div className="price-title">
          <div className="price-title-left">
            <strong>
             Proposal for {model.name} <span className="tech-badge"> ({items.technology?.toUpperCase()})</span> LED Display. ({sizeStr}) |
            </strong>

            <span className="sft-cal"> Sft:</span>{" "}
            <span className="sft-cal-">({display.sft || "—"}) </span>
          </div>

        </div>

        <table className="table invoice-table mugnee-invoice-table">
          <colgroup>
            <col className="col-sl" />
            <col className="col-item" />
            <col className="col-brand" />
            <col className="col-model" />
            <col className="col-unit" />
            <col className="col-qty" />
            <col className="col-unit-price" />
            <col className="col-total-price" />
          </colgroup>
          <thead>
            <tr>
              <th className="td-center">
                SL.
              </th>
              <th className="td-center">Item Name</th>
              <th className="td-center">Brand</th>
              <th className="td-center">Model</th>
              <th className="td-center">
                Unit
              </th>
              <th className="td-center">
                Qty
              </th>
              <th className="td-center">
                Unit Price ৳
              </th>
              <th className="td-center">
                Total Price ৳
              </th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.sl} className={r.className || ""}>
                <td className="td-center">{r.sl}</td>
                <td>
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-${index}`} className="package-line">
                          <div className="item-name">{line.name}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="item-name">{r.name}</div>
                  )}
                </td>
                <td className="td-center">
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-brand-${index}`} className="package-line">
                          {line.brand || "—"}
                        </div>
                      ))}
                    </div>
                  ) : r.brand || "—"}
                </td>
                <td>
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-model-${index}`} className="package-line">
                          {line.model || "—"}
                        </div>
                      ))}
                    </div>
                  ) : r.model || "—"}
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
                  <td colSpan={7} className="td-right total-big">
                    Subtotal =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.totalBeforeVat)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="td-right total-big">
                    Vat ({Math.round((totals.vatRate || 0.1) * 100)}%) =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.vatAmount)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="td-right total-big">
                    Grand Total =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.grandTotal)}</td>
                </tr>
              </>
            ) : (
              <tr className="row-accent">
                <td colSpan={7} className="td-right total-big">
                  Grand Total =
                </td>
                <td className="td-right total-big">{toBDT(totals.grandTotal)}</td>
              </tr>
            )}

            {/* ✅ Discount block (ONLY when enabled) */}
            {showDiscountBlock ? (
              <>
                <tr className="row-accent">
                  <td colSpan={7} className="td-right total-big">
                    Special Discount =
                  </td>
                  <td className="td-right total-big">{toBDT(totals.discount || 0)}</td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="td-right total-big">
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
          <span className="in-words-value">
            {bdtToWords(showDiscountBlock ? (totals.payable ?? totals.grandTotal) : totals.grandTotal)}
          </span>
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
      </div>
    </div>
  );
});

export default Invoice;
