import { getPool } from "../db/pool.mjs";

function companySelector(companyIdOrCode) {
  return /^\d+$/.test(String(companyIdOrCode)) ? { column: "id", value: Number(companyIdOrCode) } : { column: "code", value: String(companyIdOrCode || "mugnee") };
}

export class CatalogRepository {
  constructor(pool = getPool()) {
    this.pool = pool;
  }

  async getCompany(companyIdOrCode = "mugnee") {
    const selector = companySelector(companyIdOrCode);
    const result = await this.pool.query(`SELECT * FROM companies WHERE ${selector.column} = $1 AND is_active`, [selector.value]);
    return result.rows[0] || null;
  }

  async getCatalog(companyIdOrCode = "mugnee", { category, includeUnpriced = false } = {}) {
    const company = await this.getCompany(companyIdOrCode);
    if (!company) return null;
    const params = [company.pricing_source_company_id || company.id, Number(company.pricing_multiplier) || 1];
    let categoryFilter = "";
    if (category) {
      params.push(category);
      categoryFilter = `AND p.category = $${params.length}`;
    }
    const join = includeUnpriced ? "LEFT JOIN" : "JOIN";
    const result = await this.pool.query(
      `SELECT p.*, COALESCE(jsonb_object_agg(cpp.price_tier, round(cpp.unit_price * $2::numeric, 4))
         FILTER (WHERE cpp.id IS NOT NULL), '{}'::jsonb) AS prices
       FROM products p
       ${join} company_product_prices cpp ON cpp.product_id = p.id AND cpp.company_id = $1 AND cpp.is_active
       WHERE p.is_active ${categoryFilter}
       GROUP BY p.id ORDER BY p.category, p.name`, params
    );
    return { company, products: result.rows };
  }

  async getProductPrice(companyIdOrCode, productId, priceTier = "default") {
    const company = await this.getCompany(companyIdOrCode);
    if (!company) return null;
    const result = await this.pool.query(
      `SELECT round(unit_price * $4::numeric, 4) unit_price, cost_price, currency, price_tier, pricing_metadata
       FROM company_product_prices WHERE company_id=$1 AND product_id=$2 AND price_tier=$3 AND is_active`,
      [company.pricing_source_company_id || company.id, productId, priceTier, Number(company.pricing_multiplier) || 1]
    );
    return result.rows[0] || null;
  }

  async getCompanySettings(companyIdOrCode = "mugnee") {
    const company = await this.getCompany(companyIdOrCode);
    if (!company) return null;
    const [calculator, quotation, invoice] = await Promise.all([
      this.pool.query("SELECT calculator_type, settings FROM calculator_settings WHERE company_id=$1 AND is_active", [company.id]),
      this.pool.query("SELECT * FROM quotation_settings WHERE company_id=$1", [company.id]),
      this.pool.query("SELECT * FROM invoice_settings WHERE company_id=$1", [company.id]),
    ]);
    return {
      company,
      calculators: Object.fromEntries(calculator.rows.map((row) => [row.calculator_type, row.settings])),
      quotation: quotation.rows[0] || null,
      invoice: invoice.rows[0] || null,
    };
  }
}
