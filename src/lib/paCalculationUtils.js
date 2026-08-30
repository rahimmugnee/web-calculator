// Pure calculation/lookup helpers for the PA System calculator.
// No React here — everything takes plain data in and returns plain data out,
// mirroring the rentalCalc.js convention so App.js/PDFButton.jsx need no
// PA-specific handling beyond snapshot.quotationType === "pa".
import { paProducts, isCommonProduct } from "../data/paProducts.js";
import { paApplicationTemplates, resolveTemplateKey } from "../data/paApplicationTemplates.js";

export const PA_VAT_RATE = 0.15;
export const AMPLIFIER_HEADROOM_FACTOR = 1.2;
const PROFESSIONAL_COMPONENT_TYPE = "professional-power-amplifier";

const AMPLIFIER_COMPONENT_TYPES = new Set([
  "mixer-amplifier",
  "wifi-amplifier",
  "multi-zone-mixer-amplifier",
  "power-amplifier",
  "professional-power-amplifier",
  "ip-amplifier",
  "ip-router-amplifier",
  "ip-multi-zone-amplifier",
  "ip-multi-channel-amplifier",
]);

// Component types that only make sense alongside an "anchor" device (an
// amplifier/controller) of the same brand + systemFamily. Used by
// validateCompatibility to flag rows whose family no longer matches the
// rest of the build (e.g. after a manual model swap).
const ANCHOR_COMPONENT_TYPES = new Set([
  "mixer-amplifier",
  "wifi-amplifier",
  "multi-zone-mixer-amplifier",
  "power-amplifier",
  "ip-system-controller",
  "ip-amplifier",
  "ip-router-amplifier",
  "ip-multi-zone-amplifier",
  "ip-multi-channel-amplifier",
  "professional-power-amplifier",
]);

const DEPENDENT_COMPONENT_TYPES = new Set([
  "paging-microphone",
  "zone-paging-microphone",
  "remote-volume-controller",
  "remote-control-panel",
  "network-paging-console",
  "management-software",
  "software-dongle",
  "call-station-extension",
  "fire-alarm-interface",
  "power-sequencer",
  "power-supply",
  "end-of-line-device",
  "network-paging-gateway",
  "management-server",
]);

let rowIdCounter = 0;
function nextRowId() {
  rowIdCounter += 1;
  return `pa-row-${Date.now().toString(36)}-${rowIdCounter}`;
}

const ceilNonNeg = (value) => Math.max(0, Math.ceil(Number(value) || 0));

export function componentTypeLabel(componentType) {
  if (componentType === "paging-microphone") return "Paging Console";
  if (componentType === "wifi-amplifier") return "WiFi Amplifier";
  if (componentType === "audio-source") return "Audio Sources Player";
  if (componentType === "wall-speaker") return "Wall Mount Speaker";

  return String(componentType || "")
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function isAmplifierComponentType(componentType) {
  return AMPLIFIER_COMPONENT_TYPES.has(componentType);
}

export function findProductById(products, id) {
  if (!id) return null;
  return products.find((product) => product.id === id) || null;
}

function productCapacity(product) {
  if (Number.isFinite(product.powerWatts)) return product.powerWatts;
  if (Number.isFinite(product.numberOfZones)) return product.numberOfZones;
  if (Number.isFinite(product.amplifierChannels)) return product.amplifierChannels;
  return product.unitPrice || 0;
}

/**
 * Candidate products for a componentType, filtered to brand + installationType
 * and sorted ascending by capacity. Common/Service (brand-agnostic) products
 * are always included regardless of the brand filter. Pass brand=null/undefined
 * to list candidates across all brands (used by the model "Replace" picker).
 */
export function getCandidateProducts({ products = paProducts, brand, installationType, componentType, systemFamilyFilter } = {}) {
  const list = products.filter((product) => {
    if (product.componentType !== componentType) return false;
    if (product.active === false) return false;
    if (installationType && !(product.installationType === installationType || product.installationType === "both")) {
      return false;
    }
    if (isCommonProduct(product)) return true;
    if (brand && product.brand !== brand) return false;
    if (systemFamilyFilter && product.systemFamily !== systemFamilyFilter) return false;
    return true;
  });
  return [...list].sort((a, b) => productCapacity(a) - productCapacity(b));
}

/** Smallest candidate meeting requiredWatts or requiredZones; null if none qualify. */
export function pickSmallestSufficientProduct({ candidates, requiredWatts, requiredZones }) {
  if (!requiredWatts && !requiredZones) return candidates[0] || null;
  const sufficient = candidates.filter((product) => {
    if (requiredWatts) return Number.isFinite(product.powerWatts) && product.powerWatts >= requiredWatts;
    const capacity = product.numberOfZones ?? product.amplifierChannels;
    return Number.isFinite(capacity) && capacity >= requiredZones;
  });
  return sufficient[0] || null;
}

/** componentType -> brand-default resolver, data-driven off paProducts fields only. */
export function resolveBrandDefaultProduct({ products = paProducts, brand, installationType, componentType, requiredWatts, requiredZones, systemFamilyFilter }) {
  const candidates = getCandidateProducts({ products, brand, installationType, componentType, systemFamilyFilter });
  if (!candidates.length) return null;
  if (requiredWatts || requiredZones) {
    return pickSmallestSufficientProduct({ candidates, requiredWatts, requiredZones }) || candidates[0];
  }
  return candidates[0];
}

export function applyProductToRow(row, product) {
  if (!product) return row;
  return {
    ...row,
    productId: product.id,
    brand: product.brand,
    productName: product.productName,
    model: product.model,
    unit: product.unit,
    unitPrice: product.unitPrice,
    speakerTapOptions: product.speakerTapOptions || null,
    speakerTapWatts: row.speakerTapWatts ?? product.defaultSpeakerTapWatts ?? null,
  };
}

/* ---------------- Wired speaker load & amplifier sizing (rules 9-10) ---------------- */

export function computeSpeakerLoad(items = []) {
  const totalWatts = items.reduce((sum, row) => {
    if (!Array.isArray(row.speakerTapOptions) || !row.speakerTapOptions.length) return sum;
    const tap = Number(row.speakerTapWatts) || 0;
    return sum + tap * Math.max(0, Number(row.qty) || 0);
  }, 0);
  return { totalWatts };
}

export function computeRequiredAmplifierCapacity(totalWatts, headroomFactor = AMPLIFIER_HEADROOM_FACTOR) {
  return Math.max(0, Number(totalWatts) || 0) * headroomFactor;
}

export function autoSelectAmplifier({ products = paProducts, brand, installationType, componentType, requiredWatts, systemFamilyFilter }) {
  const candidates = getCandidateProducts({ products, brand, installationType, componentType, systemFamilyFilter });
  if (!candidates.length) return { productId: null, insufficientAll: false };
  const picked = pickSmallestSufficientProduct({ candidates, requiredWatts });
  if (picked) return { productId: picked.id, insufficientAll: false };
  // Nothing meets requiredWatts: best-effort fall back to the LARGEST
  // available candidate (candidates is sorted ascending by capacity), not
  // the smallest, and flag it so the caller can warn.
  return { productId: candidates[candidates.length - 1].id, insufficientAll: true };
}

export function evaluateManualAmplifierSufficiency({ amplifierProduct, requiredWatts }) {
  if (!amplifierProduct || !requiredWatts || !Number.isFinite(amplifierProduct.powerWatts)) return null;
  if (amplifierProduct.powerWatts < requiredWatts) {
    return {
      code: "AMP_INSUFFICIENT",
      message: `Selected amplifier capacity is insufficient. Minimum recommended capacity: ${Math.ceil(requiredWatts)}W.`,
      severity: "error",
    };
  }
  return null;
}

/* ---------------- Multi-zone (rule 10) ----------------
 * The card UI has no per-row zone-assignment control, so each distinct
 * wired-speaker line is treated as one zone/channel of demand — a
 * reasonable approximation for validating a multi-zone amplifier's
 * numberOfZones/amplifierChannels against how many speaker lines exist. */

export function computeZoneLoads(items = []) {
  const speakerRows = items.filter((row) => Array.isArray(row.speakerTapOptions) && row.speakerTapOptions.length && Number(row.qty) > 0);
  const totalWatts = speakerRows.reduce((sum, row) => sum + Math.max(0, Number(row.speakerTapWatts) || 0) * Math.max(0, Number(row.qty) || 0), 0);
  return { zoneCount: speakerRows.length, totalWatts };
}

export function validateZoneCapacity({ zoneLoads, amplifierProduct }) {
  if (!amplifierProduct) return null;
  const capacity = amplifierProduct.numberOfZones ?? amplifierProduct.amplifierChannels;
  if (!Number.isFinite(capacity) || zoneLoads.zoneCount <= capacity) return null;
  return {
    code: "ZONE_CAPACITY_EXCEEDED",
    message: `This amplifier supports ${capacity} zone(s)/channel(s), but ${zoneLoads.zoneCount} speaker line(s) are configured. Increase capacity or add another unit.`,
    severity: "warning",
  };
}

/* ---------------- IP / PoE (rule 12) ---------------- */

export function countPoeDevices(items = [], products = paProducts) {
  return items.reduce((sum, row) => {
    const product = findProductById(products, row.productId);
    if (!product) return sum;
    if (Number(product.networkPortsRequired) > 0 || product.poeRequired) {
      return sum + Math.max(0, Number(row.qty) || 0) * Math.max(1, Number(product.networkPortsRequired) || 1);
    }
    return sum;
  }, 0);
}

export function computeSwitchRequirement({ items = [], products = paProducts }) {
  const poeDeviceCount = countPoeDevices(items, products);
  if (poeDeviceCount === 0) {
    return { poeDeviceCount: 0, requiredSwitchQty: 0, usablePoePorts: null, powerBudgetWarning: null };
  }
  const switchRow = items.find((row) => row.componentType === "poe-switch");
  const switchProduct = switchRow ? findProductById(products, switchRow.productId) : null;
  const usablePoePorts = switchProduct?.usablePoePorts;
  const requiredSwitchQty = Number.isFinite(usablePoePorts) && usablePoePorts > 0 ? Math.ceil(poeDeviceCount / usablePoePorts) : null;
  return {
    poeDeviceCount,
    requiredSwitchQty,
    usablePoePorts: usablePoePorts || null,
    powerBudgetWarning: "PoE power budget requires supplier verification.",
  };
}

/* ---------------- Compatibility (rule 13) ---------------- */

export function validateCompatibility(items = [], products = paProducts) {
  const warnings = [];
  const resolved = items.map((item) => ({ item, product: findProductById(products, item.productId) }));

  const anchorFamiliesByBrand = new Map();
  resolved.forEach(({ product }) => {
    if (!product || isCommonProduct(product)) return;
    if (!ANCHOR_COMPONENT_TYPES.has(product.componentType)) return;
    if (!anchorFamiliesByBrand.has(product.brand)) anchorFamiliesByBrand.set(product.brand, new Set());
    anchorFamiliesByBrand.get(product.brand).add(product.systemFamily);
  });

  resolved.forEach(({ item, product }) => {
    if (!product || isCommonProduct(product)) return;
    if (!DEPENDENT_COMPONENT_TYPES.has(product.componentType)) return;
    const anchorFamilies = anchorFamiliesByBrand.get(product.brand);
    if (!anchorFamilies || anchorFamilies.size === 0) return;
    if (!anchorFamilies.has(product.systemFamily)) {
      warnings.push({
        itemId: item.id,
        code: "FAMILY_MISMATCH",
        message: "This model may not be compatible with the selected system family.",
        actions: ["Choose Compatible Model", "Keep Manually"],
      });
    }
  });

  const cseEntry = resolved.find(({ product }) => product?.model === "PRA-CSE");
  const hasBoschCallStation = resolved.some(({ product }) => product?.brand === "Bosch" && ["PRA-CSLD", "PRA-CSLW"].includes(product?.model));
  if (cseEntry && !hasBoschCallStation) {
    warnings.push({
      itemId: cseEntry.item.id,
      code: "PRA_CSE_MISSING_CALL_STATION",
      message: "PRA-CSE requires a PRA-CSLD or PRA-CSLW call station in the same build.",
      actions: ["Choose Compatible Model", "Keep Manually"],
    });
  }

  const hasPassiveSpeaker = resolved.some(
    ({ product }) => product && Array.isArray(product.speakerTapOptions) && product.speakerTapOptions.length && !product.builtInAmplifier
  );
  const hasAmplifier = resolved.some(({ product }) => product && ANCHOR_COMPONENT_TYPES.has(product.componentType));
  if (hasPassiveSpeaker && !hasAmplifier) {
    warnings.push({
      itemId: null,
      code: "NO_AMPLIFIER_FOR_PASSIVE_SPEAKERS",
      message: "Passive 70V/100V speakers require an amplifier in the build.",
      actions: ["Add Component"],
    });
  }

  return warnings;
}

/* ---------------- Row builders ---------------- */

function baseRow(componentType, overrides = {}) {
  return {
    id: nextRowId(),
    componentType,
    productId: null,
    brand: "",
    productName: "",
    model: "",
    unit: "Nos.",
    qty: 1,
    unitPrice: 0,
    selectionMode: "manual",
    autoSized: false,
    speakerTapOptions: null,
    speakerTapWatts: null,
    warnings: [],
    ...overrides,
  };
}

function buildTemplateRow({ componentType, qtyOrMode, products, brand, installationType }) {
  if (qtyOrMode === "manual") {
    return baseRow(componentType, {
      warnings: [{ code: "MANUAL_PRO_AMP", message: "Manual professional amplifier selection required.", severity: "info" }],
    });
  }

  const autoSized = qtyOrMode === "auto";
  const qty = autoSized ? 1 : Math.max(1, Number(qtyOrMode) || 1);
  const row = baseRow(componentType, { qty, selectionMode: "auto", autoSized });
  const product = resolveBrandDefaultProduct({ products, brand, installationType, componentType });
  return applyProductToRow(row, product);
}

/**
 * Re-sizes every selectionMode="auto" amplifier/poe-switch row against the
 * CURRENT speaker load / PoE endpoint count in `items`. Call this again
 * whenever qty, power tap, or model selection changes on any row (not just
 * at template-build/brand-change time) so the amplifier and switch stay
 * correctly sized as the build evolves.
 */
export function resizeAutoRows(items, { products, brand, installationType }) {
  const { totalWatts } = computeSpeakerLoad(items);
  const requiredWatts = computeRequiredAmplifierCapacity(totalWatts);
  const switchInfo = computeSwitchRequirement({ items, products });

  return items.map((row) => {
    if (!row.autoSized) return row;

    if (row.componentType === "poe-switch") {
      return { ...row, qty: Math.max(1, switchInfo.requiredSwitchQty || 1) };
    }

    if (isAmplifierComponentType(row.componentType) && row.componentType !== PROFESSIONAL_COMPONENT_TYPE) {
      const picked = autoSelectAmplifier({ products, brand, installationType, componentType: row.componentType, requiredWatts });
      if (!picked.productId) {
        return {
          ...row,
          warnings: [
            {
              code: "AMP_INSUFFICIENT_CATALOG",
              message: `No ${componentTypeLabel(row.componentType)} is available for this brand/installation type.`,
              severity: "warning",
            },
          ],
        };
      }
      const pickedProduct = findProductById(products, picked.productId);
      const applied = applyProductToRow(row, pickedProduct);
      if (picked.insufficientAll) {
        return {
          ...applied,
          warnings: [
            {
              code: "AMP_INSUFFICIENT_CATALOG",
              message: `No single ${componentTypeLabel(row.componentType)} in the catalog meets the required ${Math.ceil(requiredWatts)}W (largest available selected: ${applied.model}, ${pickedProduct?.powerWatts ?? "?"}W). Increase quantity or use a multi-amplifier setup.`,
              severity: "warning",
            },
          ],
        };
      }
      return { ...applied, warnings: [] };
    }

    return row;
  });
}

/** Resolves applicationType through the alias map and expands its template into full item rows. */
export function buildItemsFromTemplate({ applicationType, installationType, brand, products = paProducts }) {
  const templateKey = resolveTemplateKey(applicationType);
  if (!templateKey) return [];
  const templateRows = paApplicationTemplates[templateKey]?.[installationType] || [];
  const items = templateRows.map(([componentType, qtyOrMode]) => buildTemplateRow({ componentType, qtyOrMode, products, brand, installationType }));
  return resizeAutoRows(items, { products, brand, installationType });
}

/** Replaces only selectionMode="auto" rows with the new brand's default model; preserves manual/custom rows and quantities. */
export function applyBrandChange({ items, products = paProducts, newBrand, installationType }) {
  const swapped = items.map((row) => {
    if (row.selectionMode !== "auto" || row.componentType === PROFESSIONAL_COMPONENT_TYPE) return row;
    const product = resolveBrandDefaultProduct({ products, brand: newBrand, installationType, componentType: row.componentType });
    if (!product) return row;
    return applyProductToRow({ ...row, warnings: [] }, product);
  });
  return resizeAutoRows(swapped, { products, brand: newBrand, installationType });
}

export function buildManualComponentRow({ componentType, productId, products = paProducts }) {
  const product = productId ? findProductById(products, productId) : null;
  return applyProductToRow(baseRow(componentType || product?.componentType || "custom"), product);
}

export function buildCustomItemRow({ name = "", unit = "Nos.", qty = 1, unitPrice = 0 } = {}) {
  return baseRow("custom", { productName: name, unit, qty, unitPrice, selectionMode: "custom" });
}

export function cloneRowWithNewId(row) {
  return { ...row, id: nextRowId(), warnings: [...(row.warnings || [])] };
}

/* ---------------- Top-level orchestrator ---------------- */

export function calculatePASystemQuotation(snapshot = {}, products = paProducts) {
  const installationType = snapshot.paInstallationType || "wired";
  const items = snapshot.items || [];

  const { totalWatts } = computeSpeakerLoad(items);
  const requiredWatts = computeRequiredAmplifierCapacity(totalWatts);
  const zoneLoads = computeZoneLoads(items);
  const switchInfo = computeSwitchRequirement({ items, products });
  const compatWarnings = validateCompatibility(items, products);

  const rowWarnings = {};
  items.forEach((row) => {
    const product = findProductById(products, row.productId);
    const staticWarnings = (row.warnings || []).filter((w) => (w.code === "MANUAL_PRO_AMP" ? !row.productId : true));
    const dynamicWarnings = [];

    if (product && row.componentType !== PROFESSIONAL_COMPONENT_TYPE && isAmplifierComponentType(row.componentType)) {
      if (row.selectionMode === "manual") {
        const sufficiency = evaluateManualAmplifierSufficiency({ amplifierProduct: product, requiredWatts });
        if (sufficiency) dynamicWarnings.push(sufficiency);
      }
      const zoneWarning = validateZoneCapacity({ zoneLoads, amplifierProduct: product });
      if (zoneWarning) dynamicWarnings.push(zoneWarning);
    }

    const compatForRow = compatWarnings.filter((w) => w.itemId === row.id);
    rowWarnings[row.id] = [...staticWarnings, ...dynamicWarnings, ...compatForRow];
  });

  const rows = items.map((row, index) => {
    const qty = Math.max(0, Number(row.qty) || 0);
    const unitPrice = Math.max(0, Number(row.unitPrice) || 0);
    return {
      sl: index + 1,
      id: row.id,
      name: row.productName || (row.selectionMode === "custom" ? "Custom Item" : `${componentTypeLabel(row.componentType)} (model not selected)`),
      brand: row.brand,
      model: row.model,
      unit: row.unit,
      qty,
      unitPrice,
      amount: ceilNonNeg(qty * unitPrice),
      componentType: row.componentType,
      selectionMode: row.selectionMode,
    };
  });

  const subTotal = ceilNonNeg(rows.reduce((sum, row) => sum + row.amount, 0));
  const vatEnabled = Boolean(snapshot.vatEnabled);
  const vatAmount = vatEnabled ? ceilNonNeg(subTotal * PA_VAT_RATE) : 0;
  const grandTotal = ceilNonNeg(subTotal + vatAmount);
  const discountEnabled = Boolean(snapshot.discountEnabled);
  const discountApplied = discountEnabled ? Math.min(ceilNonNeg(snapshot.discountTk), grandTotal) : 0;
  const payable = ceilNonNeg(grandTotal - discountApplied);

  const systemWarnings = compatWarnings.filter((w) => !w.itemId);
  if (switchInfo.poeDeviceCount > 0) {
    systemWarnings.push({ code: "POE_BUDGET_UNVERIFIED", message: switchInfo.powerBudgetWarning, severity: "info" });
  }

  return {
    rows,
    rowWarnings,
    totals: {
      subTotal,
      totalBeforeVat: subTotal,
      vatEnabled,
      vatRate: PA_VAT_RATE,
      vatAmount,
      grandTotal,
      discountEnabled,
      discount: discountApplied,
      payable,
    },
    unitPrices: {},
    systemWarnings,
    speakerLoad: { totalWatts, requiredWatts },
    switchInfo,
    installationType,
  };
}
