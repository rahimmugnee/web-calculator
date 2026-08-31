BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pricing_multiplier numeric(10,4) NOT NULL DEFAULT 1.0000
  CHECK (pricing_multiplier > 0);

UPDATE companies AS target
SET pricing_source_company_id = source.id,
    pricing_multiplier = CASE target.code
      WHEN 'renex' THEN 1.0500
      WHEN 'sasha' THEN 1.0800
      ELSE 1.0000
    END,
    updated_at = CURRENT_TIMESTAMP
FROM companies AS source
WHERE source.code = 'mugnee'
  AND target.code IN ('mugnee-multiple', 'renex', 'sasha');

-- Derived companies calculate their selling price from Mugnee at read time.
-- Remove the old copied prices so there is only one editable price source.
DELETE FROM company_product_prices
WHERE company_id IN (
  SELECT id FROM companies WHERE code IN ('mugnee-multiple', 'renex', 'sasha')
);

COMMIT;
