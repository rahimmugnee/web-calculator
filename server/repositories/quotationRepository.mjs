import { getPool } from "../db/pool.mjs";

function nonNegative(value, field) {
  const number = Number(value || 0);
  if (!Number.isFinite(number) || number < 0) throw new TypeError(`${field} must be a non-negative number`);
  return number;
}

export class QuotationRepository {
  constructor(pool = getPool()) {
    this.pool = pool;
  }

  async create(input) {
    if (!input?.quotationNumber || !input?.companyId || !input?.calculatorType) {
      throw new TypeError("quotationNumber, companyId, and calculatorType are required");
    }
    const client = await this.pool.connect();
    try {
      await client.query("BEGIN");
      const quotation = await client.query(
        `INSERT INTO quotations (quotation_number, company_id, client_name, client_information, calculator_type,
          currency, subtotal, vat_amount, discount_amount, grand_total, status, created_by_user_id, created_by, snapshot_data)
         VALUES ($1,$2,$3,$4::jsonb,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14::jsonb) RETURNING *`,
        [input.quotationNumber, input.companyId, input.clientName || null, JSON.stringify(input.clientInformation || {}),
          input.calculatorType, input.currency || "BDT", nonNegative(input.subtotal, "subtotal"),
          nonNegative(input.vatAmount, "vatAmount"), nonNegative(input.discountAmount, "discountAmount"),
          nonNegative(input.grandTotal, "grandTotal"), input.status || "draft", input.createdByUserId || null, input.createdBy || null,
          JSON.stringify(input.snapshotData || {})]
      );
      for (const [index, item] of (input.items || []).entries()) {
        await client.query(
          `INSERT INTO quotation_items (quotation_id, product_id, line_number, item_description, model_description,
            quantity, unit, unit_price, total_price, snapshot_data)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
          [quotation.rows[0].id, item.productId || null, index + 1, item.description || item.name,
            item.model || null, nonNegative(item.quantity, "quantity"), item.unit || "Nos.",
            nonNegative(item.unitPrice, "unitPrice"), nonNegative(item.totalPrice, "totalPrice"),
            JSON.stringify(item.snapshotData || item)]
        );
      }
      await client.query("COMMIT");
      return quotation.rows[0];
    } catch (error) {
      await client.query("ROLLBACK");
      throw error;
    } finally {
      client.release();
    }
  }
}
