import express from "express";
import { existsSync } from "node:fs";
import { join } from "node:path";
import { createSession, clearSessionCookies, parseCookies, SESSION_COOKIE, setSessionCookies, sha256 } from "./auth/session.mjs";
import { hashPassword, verifyPassword } from "./auth/password.mjs";
import { getPool } from "./db/pool.mjs";
import { requireAuth, requireCsrf, requirePermission } from "./middleware/auth.mjs";
import { audit } from "./services/audit.mjs";
import { syncCatalogFallback } from "./services/catalogFallback.mjs";
import { emailValue, idValue, moneyValue, slugValue, textValue } from "./validation.mjs";

const app = express();
const pool = getPool();
const port = Number(process.env.API_PORT || 3001);
const host = process.env.API_HOST || "0.0.0.0";
const allowedOrigins = new Set((process.env.APP_ORIGIN || "http://localhost:3000").split(",").map((origin) => origin.trim()).filter(Boolean));
const loginAttempts = new Map();
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const LOGIN_LIMIT = 8;

app.disable("x-powered-by");
app.set("trust proxy", 1);
app.use(express.json({ limit: "30mb" }));
app.use((req, res, next) => {
  if (allowedOrigins.has(req.headers.origin)) {
    res.setHeader("Access-Control-Allow-Origin", req.headers.origin);
    res.setHeader("Access-Control-Allow-Credentials", "true");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-CSRF-Token");
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS");
  }
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

const asyncRoute = (handler) => (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
const paging = (query) => ({ limit: Math.min(100, Math.max(1, Number(query.limit) || 25)), offset: Math.max(0, Number(query.offset) || 0) });
const ASSET_TYPES = new Set(["logo", "site_logo", "invoice_pad", "seal", "signature"]);
const STATIC_COMPANY_ASSETS = {
  mugnee: { folder: "Mugnee-Multiple-Limited", invoice_pad: "Mugnee_Invoice.png" },
  "mugnee-multiple": { folder: "Mugnee-Multiple", invoice_pad: "Letterhead PAD 25.png" },
};
const staticAssetFile = (code, type) => {
  const config = STATIC_COMPANY_ASSETS[code];
  if (!config) return null;
  const fileName = type === "invoice_pad" ? config.invoice_pad : `${type.replace("site_logo", "logo-site")}.png`;
  const filePath = join(process.cwd(), "public", config.folder, fileName);
  return existsSync(filePath) ? filePath : null;
};
const companyAssetMap = async (company) => {
  const assets = await pool.query("SELECT asset_type FROM company_assets WHERE company_id=$1", [company.id]);
  const types = new Set(assets.rows.map(({ asset_type }) => asset_type));
  for (const type of ASSET_TYPES) if (staticAssetFile(company.code, type)) types.add(type);
  return Object.fromEntries([...types].map((type) => [type, `/api/public/company/${company.id}/assets/${type}`]));
};
const pricingProfile = async (companyId, client = pool) => {
  const result = await client.query(
    `SELECT id selected_company_id,code,
       COALESCE(pricing_source_company_id,id) pricing_company_id,
       COALESCE(pricing_multiplier,1) pricing_multiplier
     FROM companies WHERE id=$1`,
    [companyId]
  );
  if (!result.rowCount) throw Object.assign(new Error("Company not found."), { status: 404 });
  return { ...result.rows[0], pricing_multiplier: Number(result.rows[0].pricing_multiplier) || 1 };
};

app.get("/api/public/company/default", asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT id,name,code,signatory_name,signatory_designation,signatory_company_name,signatory_phone,signatory_email,
       pricing_source_company_id,pricing_multiplier
     FROM companies WHERE is_default LIMIT 1`
  );
  if (!result.rowCount) return res.status(404).json({ error: "Default company not found." });
  const company = result.rows[0];
  res.json({ ...company, assets: await companyAssetMap(company) });
}));

app.get("/api/public/companies", asyncRoute(async (_req, res) => {
  const result = await pool.query(
    `SELECT id,name,code,is_default,signatory_name,signatory_designation,signatory_company_name,signatory_phone,signatory_email,
       pricing_source_company_id,pricing_multiplier
     FROM companies WHERE is_active OR is_default ORDER BY is_default DESC,name`
  );
  const companies = await Promise.all(result.rows.map(async (company) => {
    return { ...company, assets: await companyAssetMap(company) };
  }));
  res.json(companies);
}));

app.get("/api/public/company/:id/module-prices", asyncRoute(async (req, res) => {
  const pricing=await pricingProfile(idValue(req.params.id));
  const result=await pool.query(`SELECT p.source_key,p.model,p.technical_metadata,b.name brand_name,cpp.price_tier,
      round(cpp.unit_price*$2::numeric,4) unit_price
    FROM products p JOIN company_product_prices cpp ON cpp.product_id=p.id AND cpp.company_id=$1 AND cpp.is_active
    JOIN categories c ON c.id=p.category_id
    LEFT JOIN brands b ON b.id=p.brand_id
    WHERE p.is_active AND c.is_active AND c.system_type='led-display' AND c.slug='led-module' AND cpp.price_tier='default'`,[pricing.pricing_company_id,pricing.pricing_multiplier]);
  res.json(result.rows);
}));

app.get("/api/public/company/:id/led-prices", asyncRoute(async (req, res) => {
  const pricing=await pricingProfile(idValue(req.params.id));
  const result=await pool.query(`SELECT p.source_key,p.component_type,p.model,p.technical_metadata,
      b.name brand_name,c.slug category_slug,cpp.price_tier,round(cpp.unit_price*$2::numeric,4) unit_price
    FROM products p
    JOIN company_product_prices cpp ON cpp.product_id=p.id AND cpp.company_id=$1 AND cpp.is_active
    JOIN categories c ON c.id=p.category_id
    LEFT JOIN brands b ON b.id=p.brand_id
    WHERE p.is_active AND c.is_active AND c.system_type='led-display'`,[pricing.pricing_company_id,pricing.pricing_multiplier]);
  res.json(result.rows);
}));

app.get("/api/public/catalog/led-module/brands", asyncRoute(async (_req, res) => {
  const result=await pool.query(`SELECT b.id,b.name,b.slug,p.source_key,p.model,p.technical_metadata FROM brands b
    JOIN category_brands cb ON cb.brand_id=b.id AND cb.is_active
    JOIN categories c ON c.id=cb.category_id
    LEFT JOIN products p ON p.brand_id=b.id AND p.category_id=c.id AND p.is_active
    WHERE c.slug='led-module' AND c.is_active AND b.is_active ORDER BY b.name,p.name`);
  res.json(result.rows);
}));

app.get("/api/public/company/:id/assets/:type", asyncRoute(async (req, res) => {
  const id = idValue(req.params.id); const type = String(req.params.type || "");
  if (!ASSET_TYPES.has(type)) return res.status(404).end();
  const company = await pool.query("SELECT code FROM companies WHERE id=$1", [id]);
  const result = await pool.query("SELECT mime_type,content FROM company_assets WHERE company_id=$1 AND asset_type=$2", [id, type]);
  if (!result.rowCount) {
    const filePath = staticAssetFile(company.rows[0]?.code, type);
    if (!filePath) return res.status(404).end();
    res.setHeader("Cache-Control", "no-store, max-age=0");
    return res.sendFile(filePath);
  }
  res.setHeader("Content-Type", result.rows[0].mime_type);
  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.send(result.rows[0].content);
}));

app.get("/api/health", asyncRoute(async (_req, res) => {
  await pool.query("SELECT 1");
  res.json({ ok: true });
}));

app.post("/api/public/quotations", requireAuth, requireCsrf, asyncRoute(async (req, res) => {
  const b = req.body || {};
  const companyId = idValue(b.company_id, "Company");
  const quotationNumber = textValue(b.quotation_number, "Quotation number", { max: 100 });
  const clientInfo = b.client && typeof b.client === "object" ? b.client : {};
  const items = Array.isArray(b.items) ? b.items.slice(0, 100) : [];
  const snapshot = b.snapshot && typeof b.snapshot === "object" ? b.snapshot : {};
  const grandTotal = moneyValue(b.grand_total || 0, "Grand total");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const quotation = await client.query(
      `INSERT INTO quotations(quotation_number,company_id,client_name,client_information,calculator_type,currency,subtotal,vat_amount,discount_amount,grand_total,status,created_by_user_id,created_by,snapshot_data)
       VALUES($1,$2,$3,$4::jsonb,$5,'BDT',$6,$7,$8,$9,'final',$10,$11,$12::jsonb)
       ON CONFLICT(company_id,quotation_number) DO UPDATE SET
         client_name=EXCLUDED.client_name,client_information=EXCLUDED.client_information,
         calculator_type=EXCLUDED.calculator_type,subtotal=EXCLUDED.subtotal,vat_amount=EXCLUDED.vat_amount,
         discount_amount=EXCLUDED.discount_amount,grand_total=EXCLUDED.grand_total,status='final',
         created_by_user_id=EXCLUDED.created_by_user_id,created_by=EXCLUDED.created_by,
         snapshot_data=EXCLUDED.snapshot_data,deleted_at=NULL,viewed_at=NULL,updated_at=now()
       RETURNING *`,
      [quotationNumber, companyId, String(clientInfo.name || "").slice(0,255) || null, JSON.stringify(clientInfo),
       String(b.calculator_type || "fixed").slice(0,80), moneyValue(b.subtotal || 0), moneyValue(b.vat_amount || 0),
       moneyValue(b.discount_amount || 0), grandTotal, req.user.id,
       String(req.user.display_name || req.user.email).slice(0,255), JSON.stringify(snapshot)]
    );
    const quotationId = quotation.rows[0].id;
    await client.query("DELETE FROM quotation_items WHERE quotation_id=$1", [quotationId]);
    for (let index = 0; index < items.length; index += 1) {
      const item = items[index] || {};
      await client.query(
        `INSERT INTO quotation_items(quotation_id,line_number,item_description,model_description,quantity,unit,unit_price,total_price,snapshot_data)
         VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb)`,
        [quotationId, index + 1, String(item.name || "Item").slice(0,500), String(item.model || "").slice(0,500) || null,
         Math.max(0, Number(item.qty) || 0), String(item.unit || "Pcs").slice(0,50), Math.max(0, Number(item.unitPrice) || 0),
         Math.max(0, Number(item.total) || 0), JSON.stringify({ brand: item.brand || "" })]
      );
    }
    const customerName = String(clientInfo.name || quotation.rows[0].client_name || "").trim();
    const customerOrganization = String(clientInfo.company || clientInfo.organization || "").trim();
    if (customerName) {
      const customerValues = [
        String(clientInfo.position || clientInfo.designation || "").trim(),
        String(clientInfo.mobile || clientInfo.phone || "").trim(),
        String(clientInfo.email || "").trim(),
        String(clientInfo.address || "").trim(),
      ];
      const existingCustomer = await client.query(
        `SELECT id FROM customers WHERE company_id=$1 AND lower(name)=lower($2)
         AND lower(COALESCE(organization,''))=lower(COALESCE($3,'')) ORDER BY id LIMIT 1`,
        [companyId, customerName, customerOrganization || null]
      );
      if (existingCustomer.rowCount) {
        await client.query(
          `UPDATE customers SET designation=COALESCE(NULLIF(designation,''),NULLIF($1,'')),phone=COALESCE(NULLIF(phone,''),NULLIF($2,'')),
           email=COALESCE(NULLIF(email,''),NULLIF($3,'')),address=COALESCE(NULLIF(address,''),NULLIF($4,'')),is_active=true,updated_at=now() WHERE id=$5`,
          [...customerValues, existingCustomer.rows[0].id]
        );
      } else {
        await client.query(
          `INSERT INTO customers(company_id,name,organization,designation,phone,email,address,notes,is_active)
           VALUES($1,$2,$3,NULLIF($4,''),NULLIF($5,''),NULLIF($6,''),NULLIF($7,''),'Created from quotation',true)`,
          [companyId, customerName, customerOrganization || null, ...customerValues]
        );
      }
    }
    await client.query("COMMIT");
    res.status(201).json({ id: quotationId, quotation_number: quotationNumber });
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally { client.release(); }
}));

app.post("/api/auth/login", asyncRoute(async (req, res) => {
  const rawEmail = req.body?.email ?? req.body?.username;
  const attemptKey = `${req.ip}:${String(rawEmail || "").toLowerCase()}`;
  const previous = loginAttempts.get(attemptKey);
  if (previous && previous.resetAt > Date.now() && previous.count >= LOGIN_LIMIT) {
    return res.status(429).json({ error: "Too many login attempts. Try again later." });
  }
  const email = emailValue(rawEmail);
  const password = String(req.body?.password || "");
  const result = await pool.query(
    `SELECT u.*,r.code AS "role",r.name role_name,COALESCE(array_agg(p.code) FILTER (WHERE p.code IS NOT NULL),'{}') permissions
     FROM users u JOIN roles r ON r.id=u.role_id LEFT JOIN role_permissions rp ON rp.role_id=r.id
     LEFT JOIN permissions p ON p.id=rp.permission_id WHERE lower(u.email)=lower($1) GROUP BY u.id,r.id`, [email]
  );
  const user = result.rows[0];
  if (!user?.is_active || !(await verifyPassword(password, user.password_hash))) {
    const current = previous?.resetAt > Date.now() ? previous : { count: 0, resetAt: Date.now() + LOGIN_WINDOW_MS };
    loginAttempts.set(attemptKey, { ...current, count: current.count + 1 });
    return res.status(401).json({ error: "Invalid email or password." });
  }
  loginAttempts.delete(attemptKey);
  const session = await createSession(pool, user.id, { remember: Boolean(req.body?.remember), userAgent: req.get("user-agent"), ipAddress: req.ip });
  setSessionCookies(res, session);
  await pool.query("UPDATE users SET last_login_at=now() WHERE id=$1", [user.id]);
  req.user = user;
  await audit(req, { action: "login", entityType: "auth", entityId: user.id, summary: `${user.email} signed in` });
  const { password_hash, ...safeUser } = user;
  res.json({ user: safeUser });
}));

app.post("/api/auth/logout", requireAuth, requireCsrf, asyncRoute(async (req, res) => {
  await pool.query("DELETE FROM auth_sessions WHERE id=$1", [req.user.session_id]);
  await audit(req, { action: "logout", entityType: "auth", entityId: req.user.id, summary: `${req.user.email} signed out` });
  clearSessionCookies(res);
  res.status(204).end();
}));

app.get("/api/auth/me", requireAuth, (req, res) => res.json({ user: { id: req.user.id, email: req.user.email, display_name: req.user.display_name, role: req.user.role, role_name: req.user.role_name, permissions: req.user.permissions } }));

app.use("/api/admin", requireAuth, requireCsrf);

app.get("/api/admin/dashboard", asyncRoute(async (req, res) => {
  const companyId = req.query.companyId ? idValue(req.query.companyId) : null;
  const requestedMonth = String(req.query.month || "");
  const month = /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth) ? requestedMonth : new Date().toISOString().slice(0, 7);
  const monthStart = `${month}-01`;
  const periodWhere = `q.deleted_at IS NULL AND ($1::bigint IS NULL OR q.company_id=$1) AND q.created_at >= $2::date AND q.created_at < $2::date + interval '1 month'`;
  const previousWhere = `q.deleted_at IS NULL AND ($1::bigint IS NULL OR q.company_id=$1) AND q.created_at >= $2::date - interval '1 month' AND q.created_at < $2::date`;
  const organizationExpression = `NULLIF(COALESCE(q.client_information->>'company',q.client_information->>'organization'), '')`;
  const [base, selected, previous, statuses, calculators, recent, months, organizations] = await Promise.all([
    pool.query(
      `SELECT (SELECT count(*) FROM products WHERE is_active) products,
        (SELECT count(*) FROM companies WHERE is_active) companies,
        (SELECT count(*) FROM quotations WHERE deleted_at IS NULL AND ($1::bigint IS NULL OR company_id=$1)) quotations,
        (SELECT count(*) FROM invoices WHERE ($1::bigint IS NULL OR company_id=$1)) invoices,
        (SELECT count(*) FROM customers WHERE is_active AND ($1::bigint IS NULL OR company_id=$1)) customers`, [companyId]
    ),
    pool.query(`SELECT count(*) quotations,COALESCE(sum(q.grand_total),0) quoted_value,count(DISTINCT ${organizationExpression}) organizations FROM quotations q WHERE ${periodWhere}`, [companyId, monthStart]),
    pool.query(`SELECT count(*) quotations,COALESCE(sum(q.grand_total),0) quoted_value,count(DISTINCT ${organizationExpression}) organizations FROM quotations q WHERE ${previousWhere}`, [companyId, monthStart]),
    pool.query(`SELECT q.status,count(*) count FROM quotations q WHERE ${periodWhere} GROUP BY q.status ORDER BY q.status`, [companyId, monthStart]),
    pool.query(`SELECT q.calculator_type,count(*) count FROM quotations q WHERE ${periodWhere} GROUP BY q.calculator_type ORDER BY q.calculator_type`, [companyId, monthStart]),
    pool.query(`SELECT q.*,creator.display_name created_by_name,creator.email created_by_email FROM quotations q LEFT JOIN users creator ON creator.id=q.created_by_user_id WHERE ${periodWhere} ORDER BY q.created_at DESC LIMIT 6`, [companyId, monthStart]),
    pool.query(`SELECT to_char(date_trunc('month',q.created_at),'YYYY-MM') AS month_key,count(*) quotations,COALESCE(sum(q.grand_total),0) quoted_value,count(DISTINCT ${organizationExpression}) organizations FROM quotations q WHERE q.deleted_at IS NULL AND ($1::bigint IS NULL OR q.company_id=$1) GROUP BY date_trunc('month',q.created_at) ORDER BY date_trunc('month',q.created_at) DESC`, [companyId]),
    pool.query(`SELECT organization_name,count(*) quotations,COALESCE(sum(grand_total),0) quoted_value FROM (SELECT ${organizationExpression} organization_name,q.grand_total FROM quotations q WHERE ${periodWhere}) organization_rows WHERE organization_name IS NOT NULL GROUP BY organization_name ORDER BY quoted_value DESC,organization_name`, [companyId, monthStart]),
  ]);
  res.json({
    ...base.rows[0],
    selected_month: month,
    monthly: selected.rows[0],
    previous_month: previous.rows[0],
    statuses: statuses.rows,
    calculators: calculators.rows,
    recent: recent.rows,
    months: months.rows.map(({ month_key, ...row }) => ({ month: month_key, ...row })),
    organization_list: organizations.rows,
  });
}));

app.get("/api/admin/companies", asyncRoute(async (_req, res) => res.json((await pool.query(
  `SELECT c.*,qs.quotation_prefix,qs.default_validity_days,qs.default_delivery_period,
   ins.invoice_prefix,ins.template_key,
   COALESCE((SELECT jsonb_object_agg(asset_type,file_name) FROM company_assets ca WHERE ca.company_id=c.id),'{}') assets
   FROM companies c LEFT JOIN quotation_settings qs ON qs.company_id=c.id
   LEFT JOIN invoice_settings ins ON ins.company_id=c.id ORDER BY c.is_default DESC,c.name`
)).rows)));

app.put("/api/admin/companies/:id", requirePermission("manage_companies"), asyncRoute(async (req, res) => {
  const id = idValue(req.params.id); const body = req.body || {}; const client = await pool.connect();
  try {
    await client.query("BEGIN");
    if (body.is_default) await client.query("UPDATE companies SET is_default=false WHERE id<>$1", [id]);
    const company = await client.query(
      `UPDATE companies SET name=$1,code=$2,address=COALESCE($3,address),phone=COALESCE($4,phone),email=COALESCE($5,email),website=COALESCE($6,website),is_active=$7,is_default=$8,
       currency=COALESCE($9,currency),vat_defaults=COALESCE($10::jsonb,vat_defaults),signatory_name=$11,signatory_designation=$12,signatory_company_name=$13,
       signatory_phone=$14,signatory_email=$15 WHERE id=$16 RETURNING *`,
      [textValue(body.name,"Company name"),slugValue(body.code),body.address||null,body.phone||null,body.email||null,body.website||null,
       body.is_active !== false,Boolean(body.is_default),body.currency||null,body.vat_defaults?JSON.stringify(body.vat_defaults):null,
       body.signatory_name||null,body.signatory_designation||null,body.signatory_company_name||null,body.signatory_phone||null,
       body.signatory_email||null,id]
    );
    if (!company.rowCount) throw Object.assign(new Error("Company not found."), { status: 404 });
    await client.query(`UPDATE quotation_settings SET quotation_prefix=COALESCE($1,quotation_prefix),default_validity_days=COALESCE($2,default_validity_days),default_delivery_period=COALESCE($3,default_delivery_period) WHERE company_id=$4`, [body.quotation_prefix||null,body.default_validity_days||null,body.default_delivery_period||null,id]);
    await client.query(`UPDATE invoice_settings SET invoice_prefix=COALESCE($1,invoice_prefix),template_key=COALESCE($2,template_key) WHERE company_id=$3`, [body.invoice_prefix||null,body.template_key||null,id]);
    for (const [assetType, asset] of Object.entries(body.assets || {})) {
      if (!ASSET_TYPES.has(assetType) || !asset?.data) continue;
      const match = String(asset.data).match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/);
      if (!match) throw Object.assign(new Error(`Invalid ${assetType} image.`), { status: 400 });
      const content = Buffer.from(match[2], "base64");
      if (content.length > 5 * 1024 * 1024) throw Object.assign(new Error(`${assetType} must be 5 MB or smaller.`), { status: 400 });
      await client.query(
        `INSERT INTO company_assets(company_id,asset_type,file_name,mime_type,content) VALUES($1,$2,$3,$4,$5)
         ON CONFLICT(company_id,asset_type) DO UPDATE SET file_name=EXCLUDED.file_name,mime_type=EXCLUDED.mime_type,content=EXCLUDED.content,updated_at=now()`,
        [id,assetType,String(asset.name||assetType),match[1],content]
      );
    }
    for (const assetType of body.remove_assets || []) {
      if (ASSET_TYPES.has(assetType)) await client.query("DELETE FROM company_assets WHERE company_id=$1 AND asset_type=$2", [id, assetType]);
    }
    await client.query("COMMIT");
    await audit(req,{action:"update",entityType:"company",entityId:id,companyId:id,summary:`Updated company ${body.name}`});
    res.json(company.rows[0]);
  } catch(error) { await client.query("ROLLBACK"); throw error; } finally { client.release(); }
}));

app.get("/api/admin/categories", asyncRoute(async (_req, res) => res.json((await pool.query(
  `SELECT c.*,count(DISTINCT cb.brand_id)::int brand_count,count(DISTINCT p.id)::int model_count
   FROM categories c LEFT JOIN category_brands cb ON cb.category_id=c.id AND cb.is_active
   LEFT JOIN products p ON p.category_id=c.id GROUP BY c.id ORDER BY c.system_type,c.sort_order,c.name`
)).rows)));

app.post("/api/admin/categories", requirePermission("manage_categories"), asyncRoute(async (req,res) => {
  const body=req.body||{}; const result=await pool.query(
    `INSERT INTO categories(parent_id,system_type,name,slug,uses_brand,is_active,sort_order,specifications_schema,settings)
     VALUES($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb) RETURNING *`,
    [body.parent_id||null,slugValue(body.system_type,"System"),textValue(body.name,"Name"),slugValue(body.slug),body.uses_brand!==false,body.is_active!==false,Number(body.sort_order)||0,JSON.stringify(body.specifications_schema||{}),JSON.stringify(body.settings||{})]
  ); await audit(req,{action:"create",entityType:"category",entityId:result.rows[0].id,summary:`Created category ${result.rows[0].name}`}); res.status(201).json(result.rows[0]);
}));

app.put("/api/admin/categories/:id", requirePermission("manage_categories"), asyncRoute(async (req,res) => {
  const id=idValue(req.params.id),b=req.body||{}; const result=await pool.query(
    `UPDATE categories SET parent_id=$1,name=$2,slug=$3,uses_brand=$4,is_active=$5,sort_order=$6,
     specifications_schema=$7::jsonb,settings=$8::jsonb WHERE id=$9 RETURNING *`,
    [b.parent_id||null,textValue(b.name,"Name"),slugValue(b.slug),b.uses_brand!==false,b.is_active!==false,Number(b.sort_order)||0,JSON.stringify(b.specifications_schema||{}),JSON.stringify(b.settings||{}),id]
  ); await audit(req,{action:"update",entityType:"category",entityId:id,summary:`Updated category ${result.rows[0]?.name||id}`}); res.json(result.rows[0]);
}));

app.delete("/api/admin/categories/:id", requirePermission("manage_categories"), asyncRoute(async (req,res) => {
  const id=idValue(req.params.id); const refs=await pool.query("SELECT (SELECT count(*) FROM products WHERE category_id=$1)+(SELECT count(*) FROM categories WHERE parent_id=$1) count",[id]);
  if(Number(refs.rows[0].count)>0) return res.status(409).json({error:"Deactivate this category because it is referenced by products or child categories."});
  await pool.query("DELETE FROM categories WHERE id=$1",[id]); await audit(req,{action:"delete",entityType:"category",entityId:id,summary:`Deleted category ${id}`}); res.status(204).end();
}));

app.get("/api/admin/brands", asyncRoute(async (req,res) => {
  const {limit,offset}=paging(req.query); const search=`%${String(req.query.search||"").trim()}%`;
  const result=await pool.query(
    `SELECT b.*,count(DISTINCT p.id)::int model_count,COALESCE(jsonb_agg(DISTINCT jsonb_build_object('id',c.id,'name',c.name,'system_type',c.system_type)) FILTER(WHERE c.id IS NOT NULL),'[]') categories
     FROM brands b LEFT JOIN category_brands cb ON cb.brand_id=b.id AND cb.is_active LEFT JOIN categories c ON c.id=cb.category_id LEFT JOIN products p ON p.brand_id=b.id
     WHERE b.name ILIKE $1 GROUP BY b.id ORDER BY b.name LIMIT $2 OFFSET $3`,[search,limit,offset]); res.json(result.rows);
}));

app.post("/api/admin/brands", requirePermission("manage_brands"), asyncRoute(async(req,res)=>{
  const b=req.body||{},client=await pool.connect(); try{await client.query("BEGIN"); const result=await client.query("INSERT INTO brands(name,slug,is_active) VALUES($1,$2,$3) RETURNING *",[textValue(b.name,"Brand name"),slugValue(b.slug),b.is_active!==false]);
  for(const categoryId of b.category_ids||[]) await client.query("INSERT INTO category_brands(category_id,brand_id) VALUES($1,$2) ON CONFLICT(category_id,brand_id) DO UPDATE SET is_active=true",[idValue(categoryId),result.rows[0].id]); await client.query("COMMIT"); await audit(req,{action:"create",entityType:"brand",entityId:result.rows[0].id,summary:`Created brand ${result.rows[0].name}`}); res.status(201).json(result.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}));

app.put("/api/admin/brands/:id", requirePermission("manage_brands"), asyncRoute(async(req,res)=>{
  const id=idValue(req.params.id),b=req.body||{},client=await pool.connect(); try{await client.query("BEGIN"); const result=await client.query("UPDATE brands SET name=$1,slug=$2,is_active=$3 WHERE id=$4 RETURNING *",[textValue(b.name,"Brand name"),slugValue(b.slug),b.is_active!==false,id]); await client.query("UPDATE category_brands SET is_active=false WHERE brand_id=$1",[id]); for(const categoryId of b.category_ids||[]) await client.query("INSERT INTO category_brands(category_id,brand_id,is_active) VALUES($1,$2,true) ON CONFLICT(category_id,brand_id) DO UPDATE SET is_active=true",[idValue(categoryId),id]); await client.query("COMMIT"); await audit(req,{action:"update",entityType:"brand",entityId:id,summary:`Updated brand ${result.rows[0]?.name||id}`}); res.json(result.rows[0]);}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}
}));

app.delete("/api/admin/brands/:id", requirePermission("manage_brands"), asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const refs=await pool.query("SELECT count(*) count FROM products WHERE brand_id=$1",[id]);if(Number(refs.rows[0].count))return res.status(409).json({error:"Delete or reassign this brand's models first."});const client=await pool.connect();try{await client.query("BEGIN");await client.query("DELETE FROM category_brands WHERE brand_id=$1",[id]);const deleted=await client.query("DELETE FROM brands WHERE id=$1 RETURNING name",[id]);if(!deleted.rowCount)throw Object.assign(new Error("Brand not found."),{status:404});await client.query("COMMIT");await audit(req,{action:"delete",entityType:"brand",entityId:id,summary:`Deleted brand ${deleted.rows[0].name}`}).catch((error)=>console.error("Brand deletion audit failed:",error));res.status(204).end();}catch(error){await client.query("ROLLBACK").catch(()=>{});throw error;}finally{client.release();}}));

app.get("/api/admin/products", asyncRoute(async(req,res)=>{const {limit,offset}=paging(req.query),params=[],where=[];let priceSelect="'{}'::jsonb AS prices";if(req.query.companyId){const pricing=await pricingProfile(idValue(req.query.companyId,"Company"));params.push(pricing.pricing_company_id);const companyParam=params.length;params.push(pricing.pricing_multiplier);const multiplierParam=params.length;priceSelect=`(SELECT COALESCE(jsonb_object_agg(cpp.price_tier,round(cpp.unit_price*$${multiplierParam}::numeric,4)),'{}'::jsonb) FROM company_product_prices cpp WHERE cpp.product_id=p.id AND cpp.company_id=$${companyParam} AND cpp.is_active) AS prices`;}for(const [key,column] of [["system","c.system_type"],["categoryId","p.category_id"],["brandId","p.brand_id"],["active","p.is_active"]]) if(req.query[key]!==undefined&&req.query[key]!==""){params.push(req.query[key]);where.push(`${column}=$${params.length}`);} if(req.query.search){params.push(`%${req.query.search}%`);where.push(`(p.name ILIKE $${params.length} OR p.model ILIKE $${params.length} OR p.sku ILIKE $${params.length})`);} params.push(limit,offset);const result=await pool.query(`SELECT p.*,c.name category_name,c.system_type,b.name brand_name,${priceSelect} FROM products p LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN brands b ON b.id=p.brand_id ${where.length?`WHERE ${where.join(" AND ")}`:""} ORDER BY p.name LIMIT $${params.length-1} OFFSET $${params.length}`,params);res.json(result.rows);}));

app.post("/api/admin/products", requirePermission("manage_products"), asyncRoute(async(req,res)=>{const b=req.body||{},categoryId=idValue(b.category_id,"Category");const category=await pool.query("SELECT uses_brand,system_type FROM categories WHERE id=$1",[categoryId]);if(!category.rowCount)throw Object.assign(new Error("Category not found."),{status:400});const brandId=category.rows[0].uses_brand?idValue(b.brand_id,"Brand"):null;const key=b.source_key||`admin:${Date.now()}:${slugValue(b.model||b.name,"Model")}`;const result=await pool.query(`INSERT INTO products(source_key,sku,category,component_type,name,brand,model,unit,currency,technical_metadata,source_catalog,is_active,category_id,brand_id) SELECT $1,$2,c.system_type,$3,$4,br.name,$5,$6,$7,$8::jsonb,'admin',$9,c.id,br.id FROM categories c LEFT JOIN brands br ON br.id=$10 WHERE c.id=$11 RETURNING *`,[key,b.sku||key,b.component_type||category.rows[0].system_type,textValue(b.name,"Product name"),textValue(b.model,"Model",{required:false}),b.unit||"Nos.",b.currency||"BDT",JSON.stringify(b.technical_metadata||{}),b.is_active!==false,brandId,categoryId]);await audit(req,{action:"create",entityType:"product",entityId:result.rows[0].id,summary:`Created product ${result.rows[0].name}`});res.status(201).json(result.rows[0]);}));

app.put("/api/admin/products/:id", requirePermission("manage_products"), asyncRoute(async(req,res)=>{const id=idValue(req.params.id),b=req.body||{},categoryId=idValue(b.category_id,"Category");const category=await pool.query("SELECT uses_brand FROM categories WHERE id=$1",[categoryId]);const brandId=category.rows[0]?.uses_brand?idValue(b.brand_id,"Brand"):null;const result=await pool.query(`UPDATE products p SET name=$1,model=$2,sku=$3,unit=$4,currency=$5,technical_metadata=$6::jsonb,is_active=$7,category_id=$8,brand_id=$9,brand=(SELECT name FROM brands WHERE id=$9) WHERE id=$10 RETURNING *`,[textValue(b.name,"Product name"),textValue(b.model,"Model",{required:false}),b.sku||null,b.unit||"Nos.",b.currency||"BDT",JSON.stringify(b.technical_metadata||{}),b.is_active!==false,categoryId,brandId,id]);await audit(req,{action:"update",entityType:"product",entityId:id,summary:`Updated product ${result.rows[0]?.name||id}`});res.json(result.rows[0]);}));

app.delete("/api/admin/products/:id", requirePermission("manage_products"), asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const refs=await pool.query("SELECT (SELECT count(*) FROM quotation_items WHERE product_id=$1)+(SELECT count(*) FROM invoice_items WHERE product_id=$1) count",[id]);if(Number(refs.rows[0].count))return res.status(409).json({error:"Deactivate this product because historical documents reference it."});await pool.query("DELETE FROM products WHERE id=$1",[id]);await audit(req,{action:"delete",entityType:"product",entityId:id,summary:`Deleted product ${id}`});res.status(204).end();}));

app.get("/api/admin/prices", asyncRoute(async(req,res)=>{const pricing=await pricingProfile(idValue(req.query.companyId,"Company")),{limit,offset}=paging(req.query),search=`%${req.query.search||""}%`;const result=await pool.query(`SELECT p.id,p.model,p.name,b.name brand,c.name category,c.system_type,COALESCE(jsonb_object_agg(cpp.price_tier,round(cpp.unit_price*$7::numeric,4)) FILTER(WHERE cpp.id IS NOT NULL),'{}') prices,max(cpp.updated_at) last_updated FROM products p LEFT JOIN brands b ON b.id=p.brand_id LEFT JOIN categories c ON c.id=p.category_id LEFT JOIN company_product_prices cpp ON cpp.product_id=p.id AND cpp.company_id=$1 WHERE (p.name ILIKE $2 OR p.model ILIKE $2) AND ($3::bigint IS NULL OR p.category_id=$3) AND ($4::bigint IS NULL OR p.brand_id=$4) GROUP BY p.id,b.name,c.name,c.system_type ORDER BY p.name LIMIT $5 OFFSET $6`,[pricing.pricing_company_id,search,req.query.categoryId||null,req.query.brandId||null,limit,offset,pricing.pricing_multiplier]);res.json(result.rows);}));

app.put("/api/admin/prices/:productId", requirePermission("manage_prices"), asyncRoute(async(req,res)=>{const productId=idValue(req.params.productId),selectedCompanyId=idValue(req.body.company_id,"Company"),client=await pool.connect();try{await client.query("BEGIN");const pricing=await pricingProfile(selectedCompanyId,client);if(pricing.pricing_company_id!==pricing.selected_company_id&&pricing.pricing_multiplier!==1)throw Object.assign(new Error("This company price is calculated automatically. Update Mugnee pricing instead."),{status:409});for(const [tier,value] of Object.entries(req.body.prices||{})){if(value===""||value===null)continue;const requestedTier=slugValue(tier,"Tier"),storedTier=requestedTier==="gold"?"default":requestedTier;await client.query(`INSERT INTO company_product_prices(company_id,product_id,price_tier,unit_price,currency,is_active) VALUES($1,$2,$3,$4,'BDT',true) ON CONFLICT(company_id,product_id,price_tier) DO UPDATE SET unit_price=EXCLUDED.unit_price,is_active=true`,[pricing.pricing_company_id,productId,storedTier,moneyValue(value)]);}const fallback=await syncCatalogFallback(client);await client.query("COMMIT");await audit(req,{action:"price-update",entityType:"product-price",entityId:productId,companyId:selectedCompanyId,summary:`Updated shared prices for product ${productId}`});res.json({ok:true,fallback});}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}));

app.post("/api/admin/prices/bulk-preview", requirePermission("manage_prices"), asyncRoute(async(req,res)=>{const b=req.body||{},source=await pricingProfile(idValue(b.source_company_id||b.company_id,"Source company")),destination=b.destination_company_id?await pricingProfile(idValue(b.destination_company_id,"Destination company")):source;if(b.operation!=="copy"&&source.pricing_company_id!==source.selected_company_id&&source.pricing_multiplier!==1)throw Object.assign(new Error("Derived prices cannot be adjusted directly. Update Mugnee pricing instead."),{status:409});const result=await pool.query(`SELECT count(*)::int affected_count,count(*) FILTER(WHERE dest.id IS NOT NULL)::int existing_destination_count FROM company_product_prices src LEFT JOIN company_product_prices dest ON dest.company_id=$2 AND dest.product_id=src.product_id AND dest.price_tier=src.price_tier WHERE src.company_id=$1 AND src.is_active`,[source.pricing_company_id,destination.pricing_company_id]);res.json({...result.rows[0],operation:b.operation||"percentage"});}));

app.post("/api/admin/prices/bulk-apply", requirePermission("manage_prices"), asyncRoute(async(req,res)=>{if(req.body?.confirm!==true)return res.status(400).json({error:"Explicit confirmation is required."});const b=req.body||{},client=await pool.connect();try{await client.query("BEGIN");let result;if(b.operation==="copy"){const source=await pricingProfile(idValue(b.source_company_id),client),destination=await pricingProfile(idValue(b.destination_company_id),client);if(source.pricing_company_id===destination.pricing_company_id)result={rowCount:0};else result=await client.query(`INSERT INTO company_product_prices(company_id,product_id,price_tier,unit_price,cost_price,currency,pricing_metadata,is_active) SELECT $2,product_id,price_tier,unit_price,cost_price,currency,jsonb_build_object('copiedFrom',$1),is_active FROM company_product_prices WHERE company_id=$1 AND is_active ON CONFLICT(company_id,product_id,price_tier) DO NOTHING`,[source.pricing_company_id,destination.pricing_company_id]);}else{const pricing=await pricingProfile(idValue(b.company_id),client),percentage=Number(b.percentage);if(pricing.pricing_company_id!==pricing.selected_company_id&&pricing.pricing_multiplier!==1)throw Object.assign(new Error("Derived prices cannot be adjusted directly. Update Mugnee pricing instead."),{status:409});if(!Number.isFinite(percentage)||percentage<=-100||percentage>1000)throw Object.assign(new Error("Percentage is invalid."),{status:400});result=await client.query("UPDATE company_product_prices SET unit_price=round(unit_price*(1+$2/100),4) WHERE company_id=$1 AND is_active",[pricing.pricing_company_id,percentage]);}const fallback=await syncCatalogFallback(client);await client.query("COMMIT");await audit(req,{action:"bulk-price-update",entityType:"product-price",companyId:b.destination_company_id||b.company_id,summary:`Bulk price ${b.operation||"percentage"}: ${result.rowCount} rows`,metadata:{operation:b.operation,percentage:b.percentage}});res.json({updated:result.rowCount,fallback});}catch(e){await client.query("ROLLBACK");throw e;}finally{client.release();}}));

app.get("/api/admin/pricing-tiers", asyncRoute(async(_req,res)=>res.json((await pool.query("SELECT * FROM pricing_tiers ORDER BY sort_order,name")).rows)));
app.put("/api/admin/pricing-tiers/:id", requirePermission("manage_prices"), asyncRoute(async(req,res)=>{const id=idValue(req.params.id),b=req.body||{};const result=await pool.query("UPDATE pricing_tiers SET name=$1,description=$2,warranty_years=$3,is_active=$4 WHERE id=$5 RETURNING *",[textValue(b.name,"Name"),b.description||null,b.warranty_years||null,b.is_active!==false,id]);await audit(req,{action:"update",entityType:"pricing-tier",entityId:id,summary:`Updated pricing tier ${result.rows[0]?.name||id}`});res.json(result.rows[0]);}));

app.get("/api/admin/settings/:companyId", asyncRoute(async(req,res)=>{const id=idValue(req.params.companyId);const [calc,quote,invoice]=await Promise.all([pool.query("SELECT * FROM calculator_settings WHERE company_id=$1 ORDER BY calculator_type",[id]),pool.query("SELECT * FROM quotation_settings WHERE company_id=$1",[id]),pool.query("SELECT * FROM invoice_settings WHERE company_id=$1",[id])]);res.json({calculators:calc.rows,quotation:quote.rows[0],invoice:invoice.rows[0]});}));
app.put("/api/admin/settings/:companyId/:type", requirePermission("manage_calculator_settings"), asyncRoute(async(req,res)=>{const companyId=idValue(req.params.companyId),type=slugValue(req.params.type,"Calculator type");const result=await pool.query(`INSERT INTO calculator_settings(company_id,calculator_type,settings) VALUES($1,$2,$3::jsonb) ON CONFLICT(company_id,calculator_type) DO UPDATE SET settings=EXCLUDED.settings,is_active=true RETURNING *`,[companyId,type,JSON.stringify(req.body?.settings||{})]);await audit(req,{action:"update",entityType:"calculator-settings",entityId:result.rows[0].id,companyId,summary:`Updated ${type} calculator settings`});res.json(result.rows[0]);}));

app.put("/api/admin/templates/:companyId/quotation", requirePermission("manage_templates"), asyncRoute(async(req,res)=>{const companyId=idValue(req.params.companyId),b=req.body||{};const result=await pool.query(`UPDATE quotation_settings SET quotation_prefix=$1,header_information=$2::jsonb,footer_information=$3::jsonb,terms=$4::jsonb,branding=$5::jsonb,default_validity_days=$6,default_delivery_period=$7 WHERE company_id=$8 RETURNING *`,[textValue(b.quotation_prefix,"Quotation prefix"),JSON.stringify(b.header_information||{}),JSON.stringify(b.footer_information||{}),JSON.stringify(b.terms||[]),JSON.stringify(b.branding||{}),b.default_validity_days||null,b.default_delivery_period||null,companyId]);await audit(req,{action:"update",entityType:"quotation-template",entityId:result.rows[0]?.id,companyId,summary:"Updated quotation pad and terms"});res.json(result.rows[0]);}));
app.put("/api/admin/templates/:companyId/invoice", requirePermission("manage_templates"), asyncRoute(async(req,res)=>{const companyId=idValue(req.params.companyId),b=req.body||{};const result=await pool.query(`UPDATE invoice_settings SET invoice_prefix=$1,template_key=$2,settings=$3::jsonb WHERE company_id=$4 RETURNING *`,[textValue(b.invoice_prefix,"Invoice prefix"),slugValue(b.template_key,"Template key"),JSON.stringify(b.settings||{}),companyId]);await audit(req,{action:"update",entityType:"invoice-template",entityId:result.rows[0]?.id,companyId,summary:"Updated invoice template settings"});res.json(result.rows[0]);}));

app.get("/api/admin/quotations", asyncRoute(async(req,res)=>{
  const {limit,offset}=paging(req.query), params=[req.query.companyId||null], where=["q.deleted_at IS NULL","($1::bigint IS NULL OR q.company_id=$1)"];
  if(req.query.status){params.push(req.query.status);where.push(`q.status=$${params.length}`);}
  if(req.query.search){params.push(`%${req.query.search}%`);where.push(`(q.quotation_number ILIKE $${params.length} OR q.client_name ILIKE $${params.length} OR q.client_information->>'company' ILIKE $${params.length})`);}
  params.push(limit,offset);
  const result=await pool.query(`SELECT q.*,c.name company_name,creator.display_name created_by_name,creator.email created_by_email,count(*) OVER() total_count FROM quotations q JOIN companies c ON c.id=q.company_id LEFT JOIN users creator ON creator.id=q.created_by_user_id WHERE ${where.join(" AND ")} ORDER BY q.created_at DESC LIMIT $${params.length-1} OFFSET $${params.length}`,params);
  res.json(result.rows);
}));
app.get("/api/admin/quotations/trash", asyncRoute(async(req,res)=>{const {limit,offset}=paging(req.query);const result=await pool.query(`SELECT q.*,c.name company_name,creator.display_name created_by_name,creator.email created_by_email,count(*) OVER() total_count FROM quotations q JOIN companies c ON c.id=q.company_id LEFT JOIN users creator ON creator.id=q.created_by_user_id WHERE q.deleted_at IS NOT NULL AND ($1::bigint IS NULL OR q.company_id=$1) ORDER BY q.deleted_at DESC LIMIT $2 OFFSET $3`,[req.query.companyId||null,limit,offset]);res.json(result.rows);}));
app.post("/api/admin/quotations/:id/viewed",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const result=await pool.query("UPDATE quotations SET viewed_at=COALESCE(viewed_at,now()) WHERE id=$1 AND deleted_at IS NULL RETURNING viewed_at",[id]);if(!result.rowCount)return res.status(404).json({error:"Quotation not found."});res.json(result.rows[0]);}));
app.post("/api/admin/quotations/:id/restore",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const result=await pool.query("UPDATE quotations SET deleted_at=NULL WHERE id=$1 AND deleted_at IS NOT NULL RETURNING quotation_number,company_id",[id]);if(!result.rowCount)return res.status(404).json({error:"Deleted quotation not found."});await audit(req,{action:"restore",entityType:"quotation",entityId:id,companyId:result.rows[0].company_id,summary:`Restored quotation ${result.rows[0].quotation_number}`});res.json({ok:true});}));
app.delete("/api/admin/quotations/:id/permanent",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const client=await pool.connect();try{await client.query("BEGIN");const found=await client.query("SELECT quotation_number,company_id FROM quotations WHERE id=$1 AND deleted_at IS NOT NULL",[id]);if(!found.rowCount){await client.query("ROLLBACK");return res.status(404).json({error:"Deleted quotation not found in recycle bin."});}await audit(req,{action:"permanent-delete",entityType:"quotation",entityId:id,companyId:found.rows[0].company_id,summary:`Permanently deleted quotation ${found.rows[0].quotation_number}`});await client.query("DELETE FROM quotations WHERE id=$1",[id]);await client.query("COMMIT");res.status(204).end();}catch(error){await client.query("ROLLBACK");throw error;}finally{client.release();}}));
app.get("/api/admin/quotations/:id", asyncRoute(async(req,res)=>{
  const id=idValue(req.params.id);
  const [quotation,items]=await Promise.all([
    pool.query("SELECT q.*,c.name company_name,creator.display_name created_by_name,creator.email created_by_email FROM quotations q JOIN companies c ON c.id=q.company_id LEFT JOIN users creator ON creator.id=q.created_by_user_id WHERE q.id=$1 AND q.deleted_at IS NULL",[id]),
    pool.query("SELECT * FROM quotation_items WHERE quotation_id=$1 ORDER BY line_number",[id]),
  ]);
  if(!quotation.rowCount)return res.status(404).json({error:"Quotation not found."});
  res.json({...quotation.rows[0],items:items.rows});
}));
app.patch("/api/admin/quotations/:id/status",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id),status=slugValue(req.body?.status,"Status");const result=await pool.query("UPDATE quotations SET status=$1 WHERE id=$2 RETURNING *",[status,id]);await audit(req,{action:"status-update",entityType:"quotation",entityId:id,companyId:result.rows[0]?.company_id,summary:`Changed quotation ${id} to ${status}`});res.json(result.rows[0]);}));
app.delete("/api/admin/quotations/:id",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id);const result=await pool.query("UPDATE quotations SET deleted_at=now() WHERE id=$1 AND deleted_at IS NULL RETURNING quotation_number,company_id",[id]);if(!result.rowCount)return res.status(404).json({error:"Quotation not found."});await audit(req,{action:"move-to-recycle-bin",entityType:"quotation",entityId:id,companyId:result.rows[0].company_id,summary:`Moved quotation ${result.rows[0].quotation_number} to recycle bin`});res.status(204).end();}));

for(const [path,table,permission] of [["invoices","invoices","manage_invoices"]]){
  app.get(`/api/admin/${path}`,asyncRoute(async(req,res)=>{const {limit,offset}=paging(req.query);const result=await pool.query(`SELECT d.*,c.name company_name FROM ${table} d JOIN companies c ON c.id=d.company_id WHERE ($1::bigint IS NULL OR d.company_id=$1) ORDER BY d.created_at DESC LIMIT $2 OFFSET $3`,[req.query.companyId||null,limit,offset]);res.json(result.rows);}));
  app.patch(`/api/admin/${path}/:id/status`,requirePermission(permission),asyncRoute(async(req,res)=>{const id=idValue(req.params.id),status=slugValue(req.body?.status,"Status");const result=await pool.query(`UPDATE ${table} SET status=$1 WHERE id=$2 RETURNING *`,[status,id]);await audit(req,{action:"status-update",entityType:path.slice(0,-1),entityId:id,companyId:result.rows[0]?.company_id,summary:`Changed ${path.slice(0,-1)} ${id} to ${status}`});res.json(result.rows[0]);}));
}

app.get("/api/admin/customers",asyncRoute(async(req,res)=>{
  const {limit,offset}=paging(req.query);
  const result=await pool.query(`SELECT c.*,stats.total_quotations,stats.quoted_value,stats.last_quotation_at,stats.last_quotation_number,
    count(*) OVER() total_count,count(*) FILTER (WHERE c.is_active) OVER() active_count,
    COALESCE(sum(stats.total_quotations) OVER(),0) all_customer_quotations,COALESCE(sum(stats.quoted_value) OVER(),0) all_customer_quoted_value
    FROM customers c LEFT JOIN LATERAL (
      SELECT count(*)::int total_quotations,COALESCE(sum(q.grand_total),0) quoted_value,max(q.created_at) last_quotation_at,
        (array_agg(q.quotation_number ORDER BY q.created_at DESC))[1] last_quotation_number
      FROM quotations q WHERE q.company_id=c.company_id AND q.deleted_at IS NULL AND lower(q.client_name)=lower(c.name) AND (
        lower(COALESCE(q.client_information->>'company',q.client_information->>'organization',''))=lower(COALESCE(c.organization,'')) OR
        (NULLIF(c.email,'') IS NOT NULL AND lower(q.client_information->>'email')=lower(c.email)) OR
        (NULLIF(c.phone,'') IS NOT NULL AND regexp_replace(COALESCE(q.client_information->>'mobile',''),'[^0-9]','','g')=regexp_replace(c.phone,'[^0-9]','','g'))
      )
    ) stats ON true WHERE ($1::bigint IS NULL OR c.company_id=$1)
    ORDER BY c.is_active DESC,c.name LIMIT $2 OFFSET $3`,[req.query.companyId||null,limit,offset]);
  res.json(result.rows);
}));
app.post("/api/admin/customers",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const b=req.body||{};const result=await pool.query("INSERT INTO customers(company_id,name,organization,designation,phone,email,address,notes,is_active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *",[b.company_id||null,textValue(b.name,"Name"),b.organization||null,b.designation||null,b.phone||null,b.email||null,b.address||null,b.notes||null,b.is_active!==false]);await audit(req,{action:"create",entityType:"customer",entityId:result.rows[0].id,companyId:b.company_id,summary:`Created customer ${result.rows[0].name}`});res.status(201).json(result.rows[0]);}));
app.put("/api/admin/customers/:id",requirePermission("manage_quotations"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id),b=req.body||{};const result=await pool.query("UPDATE customers SET name=$1,organization=$2,designation=$3,phone=$4,email=$5,address=$6,notes=$7,is_active=$8 WHERE id=$9 RETURNING *",[textValue(b.name,"Name"),b.organization||null,b.designation||null,b.phone||null,b.email||null,b.address||null,b.notes||null,b.is_active!==false,id]);await audit(req,{action:"update",entityType:"customer",entityId:id,companyId:result.rows[0]?.company_id,summary:`Updated customer ${result.rows[0]?.name||id}`});res.json(result.rows[0]);}));

app.get("/api/admin/roles",requirePermission("manage_users"),asyncRoute(async(_req,res)=>res.json((await pool.query("SELECT id,name,code,description FROM roles ORDER BY id")).rows)));
app.get("/api/admin/users",requirePermission("manage_users"),asyncRoute(async(_req,res)=>res.json((await pool.query("SELECT u.id,u.email,u.display_name,u.is_active,u.last_login_at,u.created_at,r.id role_id,r.name role_name,r.code AS \"role\" FROM users u JOIN roles r ON r.id=u.role_id ORDER BY u.email")).rows)));
app.post("/api/admin/users",requirePermission("manage_users"),asyncRoute(async(req,res)=>{const b=req.body||{},email=emailValue(b.email),hash=await hashPassword(String(b.password||""));const result=await pool.query("INSERT INTO users(username,email,display_name,password_hash,role_id,is_active) VALUES($1,$1,$2,$3,$4,$5) RETURNING id,email,display_name,is_active",[email,textValue(b.display_name,"Display name"),hash,idValue(b.role_id,"Role"),b.is_active!==false]);await audit(req,{action:"create",entityType:"user",entityId:result.rows[0].id,summary:`Created user ${result.rows[0].email}`});res.status(201).json(result.rows[0]);}));
app.put("/api/admin/users/:id",requirePermission("manage_users"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id),b=req.body||{},email=emailValue(b.email);const result=await pool.query("UPDATE users SET username=$1,email=$1,display_name=$2,role_id=$3,is_active=$4 WHERE id=$5 RETURNING id,email,display_name,is_active",[email,textValue(b.display_name,"Display name"),idValue(b.role_id,"Role"),b.is_active!==false,id]);await audit(req,{action:"update",entityType:"user",entityId:id,summary:`Updated user ${result.rows[0]?.email||id}`});res.json(result.rows[0]);}));
app.post("/api/admin/users/:id/reset-password",requirePermission("manage_users"),asyncRoute(async(req,res)=>{const id=idValue(req.params.id),hash=await hashPassword(String(req.body?.password||""));await pool.query("UPDATE users SET password_hash=$1,password_changed_at=now() WHERE id=$2",[hash,id]);await pool.query("DELETE FROM auth_sessions WHERE user_id=$1 AND id<>$2",[id,req.user.session_id]);await audit(req,{action:"password-reset",entityType:"user",entityId:id,summary:`Reset password for user ${id}`});res.json({ok:true});}));

app.get("/api/admin/activity-logs",requirePermission("view_activity_logs"),asyncRoute(async(req,res)=>{const {limit,offset}=paging(req.query);res.json((await pool.query("SELECT l.*,u.email,c.name company_name FROM activity_logs l LEFT JOIN users u ON u.id=l.user_id LEFT JOIN companies c ON c.id=l.company_id ORDER BY l.created_at DESC LIMIT $1 OFFSET $2",[limit,offset])).rows);}));

app.use((error,req,res,_next)=>{console.error(error);if(error.code==="23505")return res.status(409).json({error:"A record with that name or code already exists."});if(error.code==="23503")return res.status(409).json({error:"This record is referenced elsewhere and cannot be removed."});res.status(error.status||500).json({error:error.status?error.message:"The server could not complete the request."});});

if(process.env.NODE_ENV==="production"){
  const build=join(process.cwd(),"build"); app.use(express.static(build)); app.get("/{*path}",(_req,res)=>res.sendFile(join(build,"index.html")));
}

app.listen(port,host,()=>console.log(`Calculator admin API listening on http://${host}:${port}`));
