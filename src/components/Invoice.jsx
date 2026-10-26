// ===============================
// src/components/Invoice.jsx
// ===============================
import { forwardRef, useMemo } from "react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { bdtToWords, generateRef } from "../lib/calc.js";
import { cabinetItemName, componentModelName, powerSupplyItemName, withoutLedTechnology } from "../lib/itemNames.js";
import RentalInvoice from "./RentalInvoice.jsx";
import PAInvoice from "./PAInvoice.jsx";
import ConferenceInvoice from "./ConferenceInvoice.jsx";
import InvoiceTable from "./InvoiceTable.jsx";
import RenexInvoice from "./company-invoices/RenexInvoice.jsx";
import SashaInvoice from "./company-invoices/SashaInvoice.jsx";

const Invoice = forwardRef(function Invoice({ calc, snapshot, orderDate = new Date(), quotationRef }, ref) {
  const { catalog, company, invoiceSettings } = useCatalog();
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
  const configuredTemplate = String(invoiceSettings?.template_key || "").split("-")[0].toLowerCase();
  const invoiceCompanyCode = ["mugnee", "renex", "sasha"].includes(configuredTemplate)
    ? configuredTemplate
    : String(company?.code || "").toLowerCase();
  const isIrregular = snapshot?.quotationMode === "irregular";
  const irregularQty = Math.max(1, Math.ceil(Number(snapshot?.irregular?.qty) || 1));
  const usePackageRow = isIrregular && !["renex", "sasha"].includes(invoiceCompanyCode);
  const componentQtyMultiplier = isIrregular && ["renex", "sasha"].includes(invoiceCompanyCode) ? irregularQty : 1;
  const titleArea = isIrregular && Number(display.sft) > 0
    ? Number((Number(display.sft) * irregularQty).toFixed(2))
    : display.sft;
  const moduleModelName = model.code || model.name;
  const sizeStr = `${display.widthFt || "—"}ft × ${display.heightFt || "—"}ft`;

  // controller label human-readable (Huidu + Novastar)
  const controllerLabel =
    items?.controllerLabel ||
    (items?.controllerId
      ? catalog.controllers.find((c) => c.id === items.controllerId)?.label || items.controllerId.replace(/^NS_/, "")
      : "");
  const controllerPicked = items?.controllerPicked || {};
  const receivingPicked = items?.receivingPicked || {};
  const psuPicked = items?.psuPicked || {};
  const controllerItemName = controllerPicked.itemName || controllerPicked.label || controllerLabel || "Controller";
  const receivingItemName = receivingPicked.itemName || receivingPicked.label || "Receiving Card";
  const psuItemName = powerSupplyItemName(psuPicked.itemName, psuPicked.model || psuPicked.label);

  // ---- Dynamic rows (SL auto) ----
  const rows = [];
  let sl = 1;

  // ✅ Module (NO Technology here)
  const rcLabel = items.receivingPicked?.label || "Receiving Card";

  if (usePackageRow) {
    rows.push({
      sl: sl++,
      type: "package",
      unit: snapshot?.irregular?.unit || "Set",
      qty: irregularQty,
      unitPrice: totals.ledSetUnitTotal || 0,
      total: (totals.ledSetUnitTotal || 0) * irregularQty,
      packageLines: [
        { name: withoutLedTechnology(model.itemName || "LED Display Module"), brand: items.brands?.module || model.invoiceBrand, model: moduleModelName },
        { name: psuItemName, brand: psuPicked.brand || items.brands?.psu, model: psuPicked.model || psuPicked.label || "" },
        { name: receivingItemName, brand: receivingPicked.brand || items.brands?.receiving, model: componentModelName(receivingPicked.model, rcLabel, receivingPicked.id) },
        ...(items?.cabinetEnabled ? [{ name: cabinetItemName(items.cabinet?.itemName), brand: items.cabinet?.brand || "N/A", model: items.cabinet?.model || "N/A" }] : []),
      ],
    });
  } else {
    rows.push({
      sl: sl++,
      name: withoutLedTechnology(model.itemName || "LED Display Module"),
      model: moduleModelName,
      unit: "Pcs",
      qty: componentQtyMultiplier > 1 ? items.modulesQty * componentQtyMultiplier : items.modulesQty,
      unitPrice: unitModule,
      total: totals.totalModules,
      brand: items.brands?.module || model.invoiceBrand,
    });
  }

  // Controller – only when qty>0 and id exists
  if (items.controllerQty > 0 && items.controllerId) {
    rows.push({
      sl: sl++,
      name: controllerItemName,
      model: componentModelName(controllerPicked.model, controllerLabel, items.controllerId),
      unit: "Pcs",
      qty: items.controllerQty,
      unitPrice: unitCtrl,
      total: totals.controllerTotal,
      brand: controllerPicked.brand || items.brands?.controller,
    });
  }

  // Receiving card
  if (!usePackageRow) {
    rows.push({
      sl: sl++,
      name: receivingItemName,
      model: componentModelName(receivingPicked.model, rcLabel, receivingPicked.id),
      unit: "Pcs",
      qty: componentQtyMultiplier > 1 ? items.rcQty * componentQtyMultiplier : items.rcQty,
      unitPrice: unitRC,
      total: totals.totalRC,
      brand: receivingPicked.brand || items.brands?.receiving,
    });

  // Power supply
    rows.push({
      sl: sl++,
      name: psuItemName,
      model: psuPicked.model || psuPicked.label || "",
      unit: "Pcs",
      qty: componentQtyMultiplier > 1 ? items.psQty * componentQtyMultiplier : items.psQty,
      unitPrice: unitPS,
      total: totals.totalPS,
      brand: psuPicked.brand || items.brands?.psu,
    });
  }

  // ✅ Cabinet Case (only when cabinet enabled) — must be under Power Supply
  if (!usePackageRow && items?.cabinetEnabled && (items?.cabinetQty || 0) > 0) {
    rows.push({
      sl: sl++,
      name: cabinetItemName(items.cabinet?.itemName),
      model: items.cabinet?.model || "N/A",
      unit: "Pcs",
      qty: componentQtyMultiplier > 1 ? items.cabinetQty * componentQtyMultiplier : items.cabinetQty,
      unitPrice: unitCabinet,
      total: totals.totalCabinet || 0,
      brand: items.cabinet?.brand || "N/A",
    });
  }

  const customItems = items?.customItems?.length
    ? items.customItems
    : items?.customItem?.enabled
    ? [items.customItem]
    : [];
  customItems.forEach((item, index) => {
    const price = unitPrices?.customItems?.[index] ?? (customItems.length === 1 ? unitCustomItem : Number(item.price) || 0);
    const qty = Math.max(0, Math.floor(Number(item.qty ?? 1) || 0));
    rows.push({
      sl: sl++,
      type: "custom",
      name: item.name || "Custom Item",
      unit: item.unit?.trim() || "Pcs",
      qty,
      unitPrice: price,
      total: price * qty,
    });
  });

  // Structure & Accessories remains visible even before a display size is entered.
  rows.push({
    sl: sl++,
    name: "Structure & Accessories",
    brand: "N/A",
    model: "N/A",
    unit: "Lot",
    qty: isIrregular ? irregularQty : 1,
    unitPrice: totals.accessoriesUnit ?? unitPrices?.accessories ?? totals.accessories ?? 0,
    total: totals.accessories ?? 0,
  });

  // Installation
  rows.push({
    sl: sl++,
    name: "Installation, Testing & Commissioning",
    brand: "N/A",
    model: "N/A",
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

  if (invoiceCompanyCode === "renex") {
    return <RenexInvoice isIrregular={isIrregular} irregularQty={irregularQty} ref={ref} customer={customer} dateStr={dateStr} display={display} items={items} model={model} refNo={refNo} rows={rows} totals={totals} company={company} showDiscountBlock={showDiscountBlock} />;
  }
  if (invoiceCompanyCode === "sasha") {
    return <SashaInvoice isIrregular={isIrregular} irregularQty={irregularQty} ref={ref} customer={customer} dateStr={dateStr} display={display} items={items} model={model} refNo={refNo} rows={rows} totals={totals} company={company} showDiscountBlock={showDiscountBlock} />;
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
             Proposal for {model.name} <span className="tech-badge"> ({items.technology?.toUpperCase()})</span> LED Display{items.cabinetEnabled ? " With Cabinet" : ""}. {isIrregular ? `${irregularQty} set ` : ""}({sizeStr}) |
            </strong>

            <span className="sft-cal"> Sft:</span>{" "}
            <span className="sft-cal-">({titleArea || "—"}) </span>
          </div>

        </div>

        <InvoiceTable rows={rows} totals={totals} showDiscountBlock={showDiscountBlock} />

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
