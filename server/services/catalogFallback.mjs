import { existsSync } from "node:fs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { componentModelAndPrice } from "../../src/data/component-model-and-price.js";
import { applyLedPriceRows } from "../../src/lib/apply-led-price-rows.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

const compactRecordKeys = new Set([
  "id", "value", "price", "unitPrice", "cobUnitPrice", "default",
]);

function compactJson(value) {
  if (Array.isArray(value)) return `[${value.map(compactJson).join(", ")}]`;
  if (value && typeof value === "object") {
    return `{ ${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${compactJson(item)}`).join(", ")} }`;
  }
  return JSON.stringify(value);
}

function isCompactRecord(value) {
  return Boolean(value && typeof value === "object" && !Array.isArray(value)
    && Object.keys(value).some((key) => compactRecordKeys.has(key))
    && !Object.values(value).some(Array.isArray));
}

function readableCatalogJson(value, depth = 0) {
  const indent = "  ".repeat(depth);
  const childIndent = "  ".repeat(depth + 1);
  if (Array.isArray(value)) {
    if (!value.length) return "[]";
    return `[\n${value.map((item) => `${childIndent}${isCompactRecord(item) ? compactJson(item) : readableCatalogJson(item, depth + 1)}`).join(",\n")}\n${indent}]`;
  }
  if (value && typeof value === "object") {
    if (isCompactRecord(value)) return compactJson(value);
    const entries = Object.entries(value);
    if (!entries.length) return "{}";
    return `{\n${entries.map(([key, item]) => `${childIndent}${JSON.stringify(key)}: ${isCompactRecord(item) ? compactJson(item) : readableCatalogJson(item, depth + 1)}`).join(",\n")}\n${indent}}`;
  }
  return JSON.stringify(value);
}

function orderCatalogSections(catalog) {
  const powerSupplyKeys = ["powerSupplyPrice", "powerSupplyPrices", "powerSupplyBrands", "powerSupplyModels", "psuModelLabel"];
  const ordered = {};
  for (const [key, value] of Object.entries(catalog)) {
    if (powerSupplyKeys.includes(key)) continue;
    ordered[key] = value;
    if (key === "receivingCards") {
      for (const powerKey of powerSupplyKeys) {
        if (Object.prototype.hasOwnProperty.call(catalog, powerKey)) ordered[powerKey] = catalog[powerKey];
      }
    }
  }
  return ordered;
}

export async function syncCatalogFallback(client) {
  const company = await client.query("SELECT id FROM companies WHERE code='mugnee'");
  if (!company.rowCount) throw new Error("Mugnee pricing source is unavailable.");

  const [prices, brands] = await Promise.all([
    client.query(`SELECT p.source_key,p.component_type,p.model,p.technical_metadata,
        b.name brand_name,c.slug category_slug,cpp.price_tier,cpp.unit_price
      FROM products p
      JOIN company_product_prices cpp ON cpp.product_id=p.id AND cpp.company_id=$1 AND cpp.is_active
      JOIN categories c ON c.id=p.category_id
      LEFT JOIN brands b ON b.id=p.brand_id
      WHERE p.is_active AND c.is_active AND c.system_type='led-display'`, [company.rows[0].id]),
    client.query(`SELECT b.id,b.name,b.slug,p.source_key,p.model,p.technical_metadata FROM brands b
      JOIN category_brands cb ON cb.brand_id=b.id AND cb.is_active
      JOIN categories c ON c.id=cb.category_id
      LEFT JOIN products p ON p.brand_id=b.id AND p.category_id=c.id AND p.is_active
      WHERE c.slug='led-module' AND c.is_active AND b.is_active ORDER BY b.name,p.name`),
  ]);

  const catalog = orderCatalogSections(applyLedPriceRows(componentModelAndPrice, prices.rows, brands.rows));
  const json = `${JSON.stringify(catalog, null, 2)}\n`;
  const componentSource = `/**
 * LED component catalog synchronized from the Mugnee price database.
 * Admin price updates replace the values in this object automatically.
 */
export const componentModelAndPrice = ${readableCatalogJson(catalog)};

export function getCabinetFootprintFt(physical, cabinetSizeId = "cabinet_indoor_aluminium_640x480", cabinetOptions = []) {
  const p = physical || componentModelAndPrice.physical;
  const option = (cabinetOptions?.length ? cabinetOptions : componentModelAndPrice.cabinetOptions).find(
    (cabinet) => cabinet.id === cabinetSizeId
  );

  if (option?.widthMm && option?.heightMm) {
    return { w: option.widthMm / 304.8, h: option.heightMm / 304.8 };
  }

  if (cabinetSizeId === "cabinet_640x640") return { w: p.ft320 * 2, h: p.ft320 * 2 };
  return { w: p.ft320 * 2, h: p.ft160 * 3 };
}
`;
  const writes = [
    writeFile(join(root, "src", "data", "component-model-and-price.js"), componentSource, "utf8"),
    writeFile(join(root, "public", "quotation-catalog.json"), json, "utf8"),
  ];
  const builtCatalog = join(root, "build", "quotation-catalog.json");
  if (existsSync(dirname(builtCatalog))) writes.push(writeFile(builtCatalog, json, "utf8"));
  await Promise.all(writes);
  return { products: prices.rowCount, targets: writes.length };
}
