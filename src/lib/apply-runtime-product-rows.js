const RUNTIME_SYSTEMS = new Set(["pa-system", "conference-system"]);

function metadataObject(value) {
  if (value && typeof value === "object" && !Array.isArray(value)) return { ...value };
  if (typeof value !== "string") return {};
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value || {}, key);
}

function text(value, fallback = "") {
  if (value === null || typeof value === "undefined") return fallback;
  return String(value).trim();
}

function rowSystemType(row) {
  return text(row?.system_type || row?.catalog_system_type || row?.category);
}

function runtimeId(row, systemType, metadata) {
  const sourceKey = text(row?.source_key);
  const prefix = systemType === "pa-system" ? "pa:" : "conference:";
  if (sourceKey.startsWith(prefix) && sourceKey.length > prefix.length) {
    return sourceKey.slice(prefix.length);
  }
  if (sourceKey) return sourceKey;
  if (row?.product_id !== null && typeof row?.product_id !== "undefined") return String(row.product_id);
  if (row?.id !== null && typeof row?.id !== "undefined") return String(row.id);
  return text(metadata.id || row?.model || row?.name);
}

function numericPrice(row, metadata) {
  const raw = hasOwn(row, "unit_price")
    ? row.unit_price
    : hasOwn(row, "price")
      ? row.price
      : metadata.unitPrice;
  const value = Number(raw);
  return Number.isFinite(value) ? value : 0;
}

function mapRuntimeRow(row, systemType) {
  const metadata = metadataObject(row?.technical_metadata);
  const id = runtimeId(row, systemType, metadata);
  if (!id) return null;

  const brandValue = hasOwn(row, "brand_name")
    ? row.brand_name
    : hasOwn(row, "brand")
      ? row.brand
      : metadata.brand;
  const modelValue = hasOwn(row, "model") ? row.model : metadata.model;
  const nameValue = hasOwn(row, "name") ? row.name : (metadata.productName || metadata.name);
  const unitValue = hasOwn(row, "unit") ? row.unit : metadata.unit;
  const componentTypeValue = hasOwn(row, "component_type") ? row.component_type : metadata.componentType;
  const activeValue = hasOwn(row, "is_active") ? row.is_active : metadata.active;
  const databaseId = row?.product_id ?? row?.id;
  const productName = text(nameValue, "Product");
  const compatibilityDefaults = systemType === "pa-system"
    ? { installationType: "both" }
    : { systemType: "both" };

  return {
    ...compatibilityDefaults,
    ...metadata,
    id,
    brand: text(brandValue),
    model: text(modelValue),
    name: productName,
    productName,
    unit: text(unitValue, "Nos."),
    unitPrice: numericPrice(row, metadata),
    currency: text(row?.currency ?? metadata.currency, "BDT"),
    componentType: text(componentTypeValue),
    active: activeValue !== false,
    sourceKey: text(row?.source_key),
    sourceCatalog: text(row?.source_catalog),
    catalogSystemType: systemType,
    categorySlug: text(row?.category_slug),
    priceTier: text(row?.price_tier, "default"),
    ...(databaseId === null || typeof databaseId === "undefined" ? {} : { databaseId }),
  };
}

/**
 * Converts the public product-price row shape into the product objects already
 * consumed by the PA and Conference calculators. Database columns deliberately
 * win over their (possibly stale) copies in technical_metadata.
 */
export function mapRuntimeProductRows(rows = [], { systemType } = {}) {
  if (!RUNTIME_SYSTEMS.has(systemType)) return [];

  const products = new Map();
  const selectedTiers = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const explicitSystem = rowSystemType(row);
    if (explicitSystem && explicitSystem !== systemType) continue;
    const product = mapRuntimeRow(row, systemType);
    if (!product) continue;

    const key = String(product.id);
    const currentTier = selectedTiers.get(key);
    const nextIsDefault = product.priceTier === "default";
    if (!products.has(key) || (nextIsDefault && currentTier !== "default")) {
      products.set(key, product);
      selectedTiers.set(key, product.priceTier);
    }
  }
  return [...products.values()];
}

export function applyRuntimeProductRows(
  fallbackProducts = [],
  rows = [],
  { systemType, authoritative = true } = {}
) {
  const liveProducts = mapRuntimeProductRows(rows, { systemType });
  if (authoritative) return liveProducts;

  const liveById = new Map(liveProducts.map((product) => [String(product.id), product]));
  const merged = (Array.isArray(fallbackProducts) ? fallbackProducts : []).map((product) => {
    const live = liveById.get(String(product?.id));
    if (!live) return product;
    liveById.delete(String(product.id));
    return { ...product, ...live };
  });
  return [...merged, ...liveById.values()];
}
