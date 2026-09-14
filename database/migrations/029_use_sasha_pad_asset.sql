BEGIN;

-- Remove the previously seeded Mugnee pad so Sasha uses its static pad file.
DELETE FROM company_assets
WHERE asset_type = 'invoice_pad'
  AND company_id = (SELECT id FROM companies WHERE code = 'sasha');

COMMIT;
