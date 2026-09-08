import { componentModelName, powerSupplyItemName, withoutLedTechnology } from "./itemNames.js";

function fixedRows(snapshot, calc) {
  const { model = {}, items = {} } = snapshot || {};
  const totals = calc?.totals || {};
  const unit = calc?.unitPrices || {};
  const rows = [];
  const moduleModelName = model.code || model.name;
  const add = (name, brand, modelName, itemUnit, qty, unitPrice, total) => rows.push({
    name, brand: brand || "", model: modelName || "", unit: itemUnit, qty: Number(qty) || 0,
    unitPrice: Number(unitPrice) || 0, total: Number(total) || 0,
  });
  add(withoutLedTechnology(model.itemName || "LED Display Module"), items.brands?.module || model.invoiceBrand, moduleModelName,
    "Pcs", items.modulesQty, unit.unitModule, totals.totalModules);
  if (items.controllerQty > 0) add(items.controllerPicked?.itemName || items.controllerPicked?.label || items.controllerLabel || "Controller", items.controllerPicked?.brand || items.brands?.controller, componentModelName(items.controllerPicked?.model, items.controllerLabel, items.controllerId), "Pcs", items.controllerQty, unit.unitCtrl, totals.controllerTotal);
  add(items.receivingPicked?.itemName || items.receivingPicked?.label || "Receiving Card", items.receivingPicked?.brand || items.brands?.receiving, componentModelName(items.receivingPicked?.model, items.receivingPicked?.label, items.receivingPicked?.id), "Pcs", items.rcQty, unit.unitRC, totals.totalRC);
  add(powerSupplyItemName(items.psuPicked?.itemName, items.psuPicked?.model || items.psuPicked?.label), items.psuPicked?.brand || items.brands?.psu, items.psuPicked?.model || items.psuPicked?.label, "Pcs", items.psQty, unit.unitPS, totals.totalPS);
  if (items.cabinetEnabled) add(items.cabinet?.itemName || "Cabinet", items.cabinet?.brand || "N/A", items.cabinet?.model || "N/A", "Pcs", items.cabinetQty, unit.unitCabinet, totals.totalCabinet);
  (items.customItems || []).forEach((item, index) => add(item.name || "Custom Item", "", "", "Pcs", 1, unit.customItems?.[index] ?? item.price, unit.customItems?.[index] ?? item.price));
  add("Structure & Accessories", "N/A", "N/A", "Lot", 1, totals.accessoriesUnit ?? totals.accessories ?? 0, totals.accessories ?? 0);
  add("Installation, Testing & Commissioning", "N/A", "N/A", "Make", 1, totals.installationUnit ?? totals.installation, totals.installation);
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
    subtotal: Number(totals.totalBeforeVat ?? totals.subTotal ?? totals.subtotal ?? totals.grandTotal) || 0,
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
