BEGIN;

INSERT INTO brands (name, slug, is_active)
VALUES ('Synoveta', 'synoveta', true)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    is_active = true;

INSERT INTO category_brands (category_id, brand_id, is_active)
SELECT c.id, b.id, true
FROM categories c
JOIN brands b ON b.slug = 'synoveta'
WHERE c.system_type = 'led-display'
  AND c.slug = 'led-module'
ON CONFLICT (category_id, brand_id) DO UPDATE
SET is_active = true;

-- Give Synoveta the same LED module coverage as Lampro. Only the three COB
-- models have brand-specific model names; all other models retain their pitch.
INSERT INTO products (
  source_key, sku, category, component_type, name, brand, model, unit, currency,
  technical_metadata, source_catalog, is_active, category_id, brand_id
)
SELECT
  replace(p.source_key, 'led:module:lampro:', 'led:module:synoveta:'),
  replace(COALESCE(p.sku, p.source_key), 'led:module:lampro:', 'led:module:synoveta:'),
  p.category,
  p.component_type,
  p.name,
  'Synoveta',
  CASE p.technical_metadata->>'id'
    WHEN 'cob-in-p1_25' THEN 'SVC 1.25P'
    WHEN 'cob-in-p1_53' THEN 'SVC 1.53P'
    WHEN 'cob-in-p1_86' THEN 'SVC 1.86P'
    ELSE p.technical_metadata->>'name'
  END,
  p.unit,
  p.currency,
  p.technical_metadata,
  'static-js',
  true,
  p.category_id,
  b.id
FROM products p
JOIN brands b ON b.slug = 'synoveta'
WHERE p.source_key LIKE 'led:module:lampro:%'
ON CONFLICT (source_key) DO UPDATE
SET sku = EXCLUDED.sku,
    category = EXCLUDED.category,
    component_type = EXCLUDED.component_type,
    name = EXCLUDED.name,
    brand = EXCLUDED.brand,
    model = EXCLUDED.model,
    unit = EXCLUDED.unit,
    currency = EXCLUDED.currency,
    technical_metadata = EXCLUDED.technical_metadata,
    is_active = true,
    category_id = EXCLUDED.category_id,
    brand_id = EXCLUDED.brand_id
WHERE products.source_catalog <> 'admin';

-- Match each Lampro default price and subtract Tk 250. Existing Synoveta
-- prices are preserved so a later migration run cannot overwrite admin edits.
INSERT INTO company_product_prices (
  company_id, product_id, price_tier, unit_price, cost_price, currency,
  pricing_metadata, is_active
)
SELECT
  cpp.company_id,
  synoveta.id,
  'default',
  cpp.unit_price - 250,
  CASE WHEN cpp.cost_price IS NULL THEN NULL ELSE GREATEST(cpp.cost_price - 250, 0) END,
  cpp.currency,
  cpp.pricing_metadata || jsonb_build_object(
    'source', 'synoveta-lampro-minus-250',
    'copied_from_product_id', lampro.id
  ),
  cpp.is_active
FROM company_product_prices cpp
JOIN products lampro ON lampro.id = cpp.product_id
JOIN products synoveta
  ON synoveta.source_key = replace(lampro.source_key, 'led:module:lampro:', 'led:module:synoveta:')
WHERE lampro.source_key LIKE 'led:module:lampro:%'
  AND cpp.price_tier = 'default'
ON CONFLICT (company_id, product_id, price_tier) DO NOTHING;

COMMIT;
