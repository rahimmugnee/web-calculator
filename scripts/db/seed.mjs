import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { databaseConfig } from "./config.mjs";
import { hashPassword } from "../../server/auth/password.mjs";
import { syncCatalogFallback } from "../../server/services/catalogFallback.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const catalogPath = join(root, "database", "generated", "mugnee-static-catalog.json");
await import("./export-static-catalog.mjs");
const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const client = new pg.Client(databaseConfig());

const slugify = (value) => String(value || "item").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-+|-+$)/g, "");
const titleize = (value) => String(value || "Item").split(/[-_]/).map((part) => part ? part[0].toUpperCase() + part.slice(1) : part).join(" ");

function categoryFor(item) {
  if (item.category === "led-module") return { system: "led-display", slug: "led-module", name: "LED Module" };
  if (item.category === "led-controller") return { system: "led-display", slug: "controller-video-processor", name: "Controller & Video Processor" };
  if (item.category === "receiving-card") return { system: "led-display", slug: "receiving-card", name: "Receiving Card" };
  if (item.category === "power-supply") return { system: "led-display", slug: "power-supply", name: "Power Supply" };
  if (item.category === "led-cabinet") return { system: "led-display", slug: "cabinets", name: "Cabinets" };
  if (item.category === "pa-system") return { system: "pa-system", slug: slugify(item.componentType), name: titleize(item.componentType) };
  if (item.category === "conference-system") return { system: "conference-system", slug: slugify(item.componentType), name: titleize(item.componentType) };
  return { system: "led-display", slug: "accessories", name: "Accessories" };
}

await client.connect();
try {
  await client.query("BEGIN");
  const company = await client.query("SELECT id FROM companies WHERE code = $1", [catalog.companyCode]);
  if (!company.rowCount) throw new Error("Mugnee company is missing. Run npm run db:migrate first.");
  const companyId = company.rows[0].id;

  await client.query(
    `UPDATE companies SET signatory_name=COALESCE(signatory_name,'Saiful Islam Shajib'),
      signatory_designation=COALESCE(signatory_designation,'Chief Executive Officer'),
      signatory_company_name=COALESCE(signatory_company_name,'Mugnee Multiple Limited'),
      signatory_phone=COALESCE(signatory_phone,'+8801711-927445'),
      signatory_email=COALESCE(signatory_email,'mugnee.multiple@gmail.com') WHERE id=$1`,
    [companyId]
  );
  const companyBranding = [
    { code: "mugnee", folder: "Mugnee", invoicePad: "Mugnee_Invoice.png" },
    {
      code: "renex", folder: "Renex", invoicePad: "Renex_Invoice.png",
      signatory: ["Sharif Uddin", "Chief Technology Officer", "Renex Digital", "+8801600-007242", "sharif.renex@gmail.com"],
    },
    {
      code: "sasha", folder: "Sasha", invoicePad: "Mugnee_Invoice.png",
      signatory: ["Abdur Rahim", "Sub Assistant Engineer", "Sasha Corporation", "+8801608843419", "rahim@sashabd.com"],
    },
  ];
  for (const branding of companyBranding) {
    const companyRow = await client.query("SELECT id FROM companies WHERE code=$1", [branding.code]);
    if (!companyRow.rowCount) continue;
    const brandingCompanyId = companyRow.rows[0].id;
    if (branding.signatory) {
      await client.query(
        `UPDATE companies SET signatory_name=$2,signatory_designation=$3,signatory_company_name=$4,
          signatory_phone=$5,signatory_email=$6 WHERE id=$1`,
        [brandingCompanyId, ...branding.signatory]
      );
    }
    const initialAssets = [
      ["logo", "logo.png"], ["site_logo", "logo-site.png"], ["invoice_pad", branding.invoicePad],
      ["seal", "seal.png"], ["signature", "signature.png"],
    ];
    for (const [assetType, fileName] of initialAssets) {
      const filePath = join(root, "public", branding.folder, fileName);
      if (!existsSync(filePath)) continue;
      await client.query(
        `INSERT INTO company_assets(company_id,asset_type,file_name,mime_type,content) VALUES($1,$2,$3,'image/png',$4)
         ON CONFLICT(company_id,asset_type) DO NOTHING`,
        [brandingCompanyId, assetType, fileName, readFileSync(filePath)]
      );
    }
  }

  const systemRows = [
    ["led-display", "LED Display", true], ["rental-led", "Rental LED", false],
    ["pa-system", "PA System", true], ["conference-system", "Conference System", true],
  ];
  const systemIds = new Map();
  for (const [system, name] of systemRows) {
    const result = await client.query(
      `INSERT INTO categories (system_type,name,slug,uses_brand,sort_order) VALUES ($1,$2,$1,false,0)
       ON CONFLICT (system_type,slug) DO UPDATE SET name=EXCLUDED.name,is_active=true RETURNING id`, [system, name]
    );
    systemIds.set(system, result.rows[0].id);
  }
  for (const [index, [slug, name]] of [["indoor-rental","Indoor Rental"],["outdoor-rental","Outdoor Rental"],["rental-accessories","Accessories"]].entries()) {
    await client.query(
      `INSERT INTO categories (parent_id,system_type,name,slug,uses_brand,sort_order) VALUES ($1,'rental-led',$2,$3,false,$4)
       ON CONFLICT (system_type,slug) DO UPDATE SET parent_id=EXCLUDED.parent_id,name=EXCLUDED.name,uses_brand=false,is_active=true`,
      [systemIds.get("rental-led"), name, slug, index + 1]
    );
  }
  for (const [index, [slug, name]] of [["led-module","LED Module"],["controller-video-processor","Controller & Video Processor"],["receiving-card","Receiving Card"],["power-supply","Power Supply"],["cabinets","Cabinets"],["accessories","Accessories"]].entries()) {
    await client.query(
      `INSERT INTO categories (parent_id,system_type,name,slug,uses_brand,sort_order) VALUES ($1,'led-display',$2,$3,true,$4)
       ON CONFLICT (system_type,slug) DO UPDATE SET parent_id=EXCLUDED.parent_id,name=EXCLUDED.name,uses_brand=true,is_active=true,sort_order=EXCLUDED.sort_order`,
      [systemIds.get("led-display"), name, slug, index + 1]
    );
  }

  for (const item of catalog.products) {
    const category = categoryFor(item);
    const categoryResult = await client.query(
      `INSERT INTO categories (parent_id,system_type,name,slug,uses_brand,sort_order) VALUES ($1,$2,$3,$4,true,100)
       ON CONFLICT (system_type,slug) DO UPDATE SET parent_id=EXCLUDED.parent_id,name=EXCLUDED.name,is_active=true RETURNING id`,
      [systemIds.get(category.system), category.system, category.name, category.slug]
    );
    let brandId = null;
    if (item.brand) {
      const brand = await client.query(
        `INSERT INTO brands (name,slug) VALUES ($1,$2) ON CONFLICT (slug) DO UPDATE SET name=EXCLUDED.name,is_active=true RETURNING id`,
        [item.brand, slugify(item.brand)]
      );
      brandId = brand.rows[0].id;
      await client.query(
        `INSERT INTO category_brands (category_id,brand_id,is_active) VALUES ($1,$2,true)
         ON CONFLICT (category_id,brand_id) DO UPDATE SET is_active=true`, [categoryResult.rows[0].id, brandId]
      );
    }
    const saved = await client.query(
      `INSERT INTO products (source_key, sku, category, component_type, name, brand, model, unit, currency, technical_metadata, source_catalog, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb,'static-js',true)
       ON CONFLICT (source_key) DO UPDATE SET sku=EXCLUDED.sku, category=EXCLUDED.category,
         component_type=EXCLUDED.component_type, name=EXCLUDED.name, brand=EXCLUDED.brand, model=EXCLUDED.model,
         unit=EXCLUDED.unit, currency=EXCLUDED.currency, technical_metadata=EXCLUDED.technical_metadata,
         source_catalog=EXCLUDED.source_catalog, is_active=true
       WHERE products.source_catalog <> 'admin'
       RETURNING id`,
      [item.sourceKey, item.sku, item.category, item.componentType, item.name, item.brand || null, item.model || null, item.unit || "Nos.", item.currency || "BDT", JSON.stringify(item.metadata || {})]
    );
    const productId = saved.rows[0]?.id || (await client.query("SELECT id FROM products WHERE source_key=$1", [item.sourceKey])).rows[0].id;
    await client.query("UPDATE products SET category_id=$1, brand_id=$2 WHERE id=$3 AND source_catalog <> 'admin'", [categoryResult.rows[0].id, brandId, productId]);
    if (item.category === "led-module") {
      // Preserve admin edits, and promote a legacy-only gold value before using
      // the static catalog default. Fresh databases receive only the canonical
      // default tier.
      await client.query(
        `INSERT INTO company_product_prices
           (company_id,product_id,price_tier,unit_price,cost_price,currency,pricing_metadata,is_active)
         SELECT company_id,product_id,'default',unit_price,cost_price,currency,
           pricing_metadata || jsonb_build_object('copied_from_tier','gold'),is_active
         FROM company_product_prices
         WHERE company_id=$1 AND product_id=$2 AND price_tier='gold'
         ON CONFLICT(company_id,product_id,price_tier) DO NOTHING`,
        [companyId, productId]
      );
    }
    const priceEntries = item.category === "led-module"
      ? [["default", item.prices?.default ?? item.prices?.gold]]
      : Object.entries(item.prices || {});
    for (const [tier, rawPrice] of priceEntries) {
      if (rawPrice === null || rawPrice === undefined || Number.isNaN(Number(rawPrice))) continue;
      await client.query(
        `INSERT INTO company_product_prices (company_id, product_id, price_tier, unit_price, currency, pricing_metadata, is_active)
         VALUES ($1,$2,$3,$4,$5,'{"source":"static-js"}'::jsonb,true)
         ON CONFLICT (company_id, product_id, price_tier) DO NOTHING`,
        [companyId, productId, tier, Number(rawPrice), item.currency || "BDT"]
      );
    }
  }

  // Remove the one malformed static PSU key generated by an older object-to-string mapping.
  await client.query("DELETE FROM products WHERE source_catalog='static-js' AND source_key='led:power-supply:-object-object-'");
  await client.query(`DELETE FROM category_brands
    WHERE brand_id IN (
      SELECT id FROM brands
      WHERE name LIKE '{"value":%'
        AND NOT EXISTS (SELECT 1 FROM products WHERE products.brand_id=brands.id)
    )`);
  await client.query(`DELETE FROM brands
    WHERE name LIKE '{"value":%'
      AND NOT EXISTS (SELECT 1 FROM products WHERE products.brand_id=brands.id)`);

  // All calculator companies use Mugnee as their single editable price source.
  // Renex and Sasha multipliers are applied dynamically by the API.
  await client.query(`UPDATE companies AS target
    SET pricing_source_company_id=source.id,
        pricing_multiplier=CASE target.code
          WHEN 'renex' THEN 1.0500
          WHEN 'sasha' THEN 1.0800
          ELSE 1.0000
        END
    FROM companies AS source
    WHERE source.code='mugnee'
      AND target.code IN ('mugnee-multiple','renex','sasha')`);
  await client.query(`DELETE FROM company_product_prices
    WHERE company_id IN (
      SELECT id FROM companies WHERE code IN ('mugnee-multiple','renex','sasha')
    )`);

  const adminPassword = String(process.env.ADMIN_SEED_PASSWORD || "").trim();
  if (adminPassword.length < 6) {
    throw new Error("ADMIN_SEED_PASSWORD must be set to at least 6 characters before seeding.");
  }
  const adminHash = await hashPassword(adminPassword);
  await client.query(
    `INSERT INTO users (username,email,display_name,password_hash,role_id,is_active)
     SELECT 'rahim.mugnee@gmail.com','rahim.mugnee@gmail.com','Administrator',$1,id,true FROM roles WHERE code='super-admin'
     ON CONFLICT (lower(email)) DO UPDATE SET display_name=EXCLUDED.display_name,role_id=EXCLUDED.role_id,is_active=true`,
    [adminHash]
  );
  await syncCatalogFallback(client);
  await client.query("COMMIT");
  console.log(`Seeded ${catalog.products.length} shared products, category/brand mappings, and Mugnee-based derived company pricing.`);
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  await client.end();
}
