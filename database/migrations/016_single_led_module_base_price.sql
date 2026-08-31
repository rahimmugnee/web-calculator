BEGIN;

-- LED modules keep one base price. Gold uses that base; premium tiers are
-- calculated by the application from configured percentage multipliers.
INSERT INTO company_product_prices (
  company_id,product_id,price_tier,unit_price,cost_price,currency,pricing_metadata,is_active
)
SELECT cpp.company_id,cpp.product_id,'default',cpp.unit_price,cpp.cost_price,cpp.currency,
       cpp.pricing_metadata || jsonb_build_object('gold_is_default',true),cpp.is_active
FROM company_product_prices cpp
JOIN products p ON p.id=cpp.product_id
JOIN categories c ON c.id=p.category_id
WHERE c.slug='led-module' AND cpp.price_tier='gold'
ON CONFLICT(company_id,product_id,price_tier) DO UPDATE SET
  unit_price=EXCLUDED.unit_price,
  cost_price=EXCLUDED.cost_price,
  currency=EXCLUDED.currency,
  pricing_metadata=EXCLUDED.pricing_metadata,
  is_active=EXCLUDED.is_active,
  updated_at=CURRENT_TIMESTAMP;

DELETE FROM company_product_prices cpp
USING products p,categories c
WHERE cpp.product_id=p.id
  AND p.category_id=c.id
  AND c.slug='led-module'
  AND cpp.price_tier IN ('gold','platinum','diamond');

COMMIT;
