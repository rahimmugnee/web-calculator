import { conferenceBrandTemplates, conferenceProducts, conferenceTemplates } from "../data/conferenceProducts.js";

const VAT_RATE = 0.15;
const ACCESSORY_COMPONENT_TYPES = new Set(["speaker-cable", "xlr-cable"]);
const FOOTER_COMPONENT_TYPES = new Set(["accessories", "installation-service"]);

function ceilNonNeg(value) {
  return Math.max(0, Math.ceil(Number(value) || 0));
}

function nextRowId() {
  return `conf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function conferenceComponentTypeLabel(type) {
  return String(type || "")
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getConferenceCandidateProducts({ products = conferenceProducts, brand, systemType, componentType } = {}) {
  return products.filter((product) => {
    if (componentType && product.componentType !== componentType) return false;
    if (systemType && !(product.systemType === systemType || product.systemType === "both")) return false;
    if (brand && !(product.brand === brand || product.brand === "Generic" || product.brand === "Mugnee Multiple Limited")) return false;
    return true;
  });
}

export function findConferenceProductById(products = conferenceProducts, productId) {
  return products.find((product) => product.id === productId) || null;
}

export function applyConferenceProductToRow(row, product) {
  if (!product) return row;
  return {
    ...row,
    productId: product.id,
    componentType: product.componentType,
    productName: product.productName,
    brand: product.brand,
    model: product.model,
    unit: product.unit,
    unitPrice: Number(product.unitPrice) || 0,
    selectionMode: "manual",
  };
}

export function buildConferenceRow({ componentType, qty, productId, products = conferenceProducts, brand, systemType }) {
  const brandCandidates = getConferenceCandidateProducts({ products, brand, systemType, componentType });
  const product =
    findConferenceProductById(products, productId) ||
    brandCandidates.find((candidate) => candidate.brand === brand) ||
    brandCandidates[0] ||
    getConferenceCandidateProducts({ products, brand: null, systemType, componentType })[0] ||
    null;

  return applyConferenceProductToRow(
    {
      id: nextRowId(),
      componentType,
      productName: conferenceComponentTypeLabel(componentType),
      brand: "",
      model: "",
      unit: "Nos.",
      unitPrice: 0,
      qty: Math.max(1, Number(qty) || 1),
      selectionMode: product ? "manual" : "custom",
    },
    product
  );
}

export function buildConferenceItemsFromTemplate({ systemType, brand, products = conferenceProducts }) {
  const template = conferenceBrandTemplates[brand]?.[systemType] || conferenceTemplates[systemType] || [];
  return template.map(([componentType, qty]) =>
    buildConferenceRow({ componentType, qty, products, brand, systemType })
  );
}

export function buildConferenceCustomRow() {
  return {
    id: nextRowId(),
    componentType: "custom-item",
    productName: "Custom Item",
    brand: "",
    model: "",
    unit: "Nos.",
    unitPrice: 0,
    qty: 1,
    selectionMode: "custom",
  };
}

export function cloneConferenceRow(row) {
  return { ...row, id: nextRowId() };
}

export function calculateConferenceQuotation(snapshot = {}) {
  const baseRows = (snapshot.items || []).map((row) => {
    const qty = Math.max(0, Number(row.qty) || 0);
    const unitPrice = Math.max(0, Number(row.unitPrice) || 0);
    return {
      id: row.id,
      name: row.productName || "Custom Item",
      brand: row.brand,
      model: row.model,
      unit: row.unit || "Nos.",
      qty,
      unitPrice,
      amount: ceilNonNeg(qty * unitPrice),
      componentType: row.componentType,
    };
  });

  const accessoryExtraAmount = baseRows.reduce((sum, row) => (ACCESSORY_COMPONENT_TYPES.has(row.componentType) ? sum + row.amount : sum), 0);
  const visibleRows = baseRows.filter((row) => !ACCESSORY_COMPONENT_TYPES.has(row.componentType));
  let accessoriesIndex = visibleRows.findIndex((row) => row.componentType === "accessories");

  if (accessoriesIndex >= 0) {
    const beforeAccessoriesRows = visibleRows.filter((row, index) => index > accessoriesIndex && !FOOTER_COMPONENT_TYPES.has(row.componentType));
    if (beforeAccessoriesRows.length) {
      const remainingRows = visibleRows.filter((row) => !beforeAccessoriesRows.includes(row));
      const insertIndex = remainingRows.findIndex((row) => row.componentType === "accessories");
      remainingRows.splice(insertIndex, 0, ...beforeAccessoriesRows);
      visibleRows.splice(0, visibleRows.length, ...remainingRows);
      accessoriesIndex = visibleRows.findIndex((row) => row.componentType === "accessories");
    }
  }

  if (accessoryExtraAmount > 0) {
    if (accessoriesIndex >= 0) {
      const accessoriesRow = visibleRows[accessoriesIndex];
      const amount = accessoriesRow.amount + accessoryExtraAmount;
      const qty = Math.max(1, Number(accessoriesRow.qty) || 1);
      visibleRows[accessoriesIndex] = {
        ...accessoriesRow,
        amount,
        qty,
        unitPrice: amount / qty,
      };
    } else {
      visibleRows.push({
        id: "conference-accessories-merged",
        name: "Accessories",
        brand: "Generic",
        model: "Conference Accessories",
        unit: "Lot",
        qty: 1,
        unitPrice: accessoryExtraAmount,
        amount: accessoryExtraAmount,
        componentType: "accessories",
      });
    }
  }

  const rows = visibleRows.map((row, index) => ({ ...row, sl: index + 1 }));

  const subTotal = ceilNonNeg(rows.reduce((sum, row) => sum + row.amount, 0));
  const vatEnabled = Boolean(snapshot.vatEnabled);
  const vatAmount = vatEnabled ? ceilNonNeg(subTotal * VAT_RATE) : 0;
  const grandTotal = ceilNonNeg(subTotal + vatAmount);
  const discountEnabled = Boolean(snapshot.discountEnabled);
  const discount = discountEnabled ? Math.min(ceilNonNeg(snapshot.discountTk), grandTotal) : 0;

  return {
    rows,
    totals: {
      subTotal,
      totalBeforeVat: subTotal,
      vatEnabled,
      vatRate: VAT_RATE,
      vatAmount,
      grandTotal,
      discountEnabled,
      discount,
      payable: ceilNonNeg(grandTotal - discount),
    },
    unitPrices: {},
  };
}
