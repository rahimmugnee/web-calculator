function fixedRows(snapshot, calc) {
  const { model = {}, display = {}, items = {} } = snapshot || {};
  const totals = calc?.totals || {};
  const unit = calc?.unitPrices || {};
  const rows = [];
  const add = (name, brand, modelName, itemUnit, qty, unitPrice, total) => rows.push({
    name, brand: brand || "", model: modelName || "", unit: itemUnit, qty: Number(qty) || 0,
    unitPrice: Number(unitPrice) || 0, total: Number(total) || 0,
  });
  const cob = items.cobP125SftPricing === true;
  add(cob ? "P1.25 COB LED Display with Cabinet" : "LED Display Module", items.brands?.module, model.name,
    cob ? "Sft" : "Pcs", cob ? display.sft : items.modulesQty, unit.unitModule, totals.totalModules);
  if (items.controllerQty > 0) add("Controller", items.brands?.controller, items.controllerLabel || items.controllerId, "Pcs", items.controllerQty, unit.unitCtrl, totals.controllerTotal);
  if (!cob) {
    add("Receiving Card", items.brands?.receiving, items.receivingPicked?.label, "Pcs", items.rcQty, unit.unitRC, totals.totalRC);
    add("Power Supply", items.brands?.psu, items.psuPicked?.label, "Pcs", items.psQty, unit.unitPS, totals.totalPS);
  }
  if (items.cabinetEnabled) add("Cabinet", "", items.cabinet?.invoiceLabel, "Pcs", items.cabinetQty, unit.unitCabinet, totals.totalCabinet);
  (items.customItems || []).forEach((item, index) => add(item.name || "Custom Item", "", "", "Pcs", 1, unit.customItems?.[index] ?? item.price, unit.customItems?.[index] ?? item.price));
  if (totals.accessories) add("Structure & Accessories", "", "", "Lot", 1, totals.accessoriesUnit ?? totals.accessories, totals.accessories);
  add("Installation, Testing & Commissioning", "", "", "Make", 1, totals.installationUnit ?? totals.installation, totals.installation);
  if (totals.transport) add("Transport Cost", "", "", "Lot", 1, unit.transport, totals.transport);
  return rows;
}

function genericRows(calc) {
  if (!Array.isArray(calc?.rows)) return [];
  return calc.rows.map((row) => ({
    name: row.name || row.label || row.item || row.description || row.productName || "Item",
    brand: row.brand || row.brandName || "", model: row.model || row.modelName || "", unit: row.unit || "Pcs",
    qty: Number(row.qty ?? row.quantity) || 0,
    unitPrice: Number(row.unitPrice ?? row.unit_price ?? row.price ?? row.rate) || 0,
    total: Number(row.total ?? row.totalPrice ?? row.total_price ?? row.amount) || 0,
  }));
}

export function quotationHistoryPayload({ company, quotationRef, snapshot, calc }) {
  const totals = calc?.totals || {};
  const customer = snapshot?.customer || {};
  const rows = snapshot?.quotationType === "fixed" ? fixedRows(snapshot, calc) : genericRows(calc);
  return {
    company_id: Number(company?.id), quotation_number: quotationRef,
    calculator_type: snapshot?.quotationType || "fixed",
    client: customer,
    subtotal: Number(totals.subTotal ?? totals.subtotal ?? totals.totalBeforeVat ?? totals.grandTotal) || 0,
    vat_amount: Number(totals.vatAmount) || 0,
    discount_amount: Number(totals.discount) || 0,
    grand_total: Number(totals.payable ?? totals.grandTotal ?? calc?.grandTotal) || 0,
    items: rows,
    snapshot: { form: snapshot, calculation: calc },
  };
}

export async function saveQuotationHistory(data) {
  const apiBase = process.env.REACT_APP_ADMIN_API_URL || "/api";
  const csrfToken = document.cookie.split(";").map((part) => part.trim())
    .find((part) => part.startsWith("calculator_admin_csrf="))?.slice("calculator_admin_csrf=".length) || "";
  const response = await fetch(`${apiBase}/public/quotations`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json", "X-CSRF-Token": decodeURIComponent(csrfToken) },
    body: JSON.stringify(data),
  });
  if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || "Quotation history could not be saved.");
  const saved = await response.json();
  const event = { type: "quotation-history-change", quotationId: saved.id, at: Date.now() };
  try {
    const key = "quotationUnreadNotifications";
    const current = JSON.parse(window.localStorage.getItem(key) || "[]");
    const next = [...new Set([...current, saved.id])];
    window.localStorage.setItem(key, JSON.stringify(next));
  } catch {}
  try { const channel = new BroadcastChannel("quotation-history-live"); channel.postMessage(event); channel.close(); } catch {}
  try { window.localStorage.setItem("quotationHistoryLiveUpdate", JSON.stringify(event)); } catch {}
  return saved;
}
