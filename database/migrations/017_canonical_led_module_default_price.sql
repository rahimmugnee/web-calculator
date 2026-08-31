BEGIN;

-- 016 may already be recorded in an existing database. Canonicalize any
-- remaining legacy-only LED module price without changing an existing default.
INSERT INTO company_product_prices (
  company_id,product_id,price_tier,unit_price,cost_price,currency,pricing_metadata,is_active
)
SELECT cpp.company_id,cpp.product_id,'default',cpp.unit_price,cpp.cost_price,cpp.currency,
       cpp.pricing_metadata || jsonb_build_object('copied_from_tier','gold'),cpp.is_active
FROM company_product_prices cpp
JOIN products p ON p.id=cpp.product_id
JOIN categories c ON c.id=p.category_id
WHERE c.slug='led-module' AND cpp.price_tier='gold'
ON CONFLICT(company_id,product_id,price_tier) DO NOTHING;

COMMIT;
