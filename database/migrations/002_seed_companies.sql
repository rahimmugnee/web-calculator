BEGIN;

INSERT INTO companies (name, code, is_default, is_active)
VALUES
  ('Mugnee Multiple Limited', 'mugnee', true, true),
  ('Renex', 'renex', false, true),
  ('Sasha Corporation', 'sasha', false, true)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active;

INSERT INTO quotation_settings (company_id, quotation_prefix, default_validity_days, branding)
SELECT id,
       CASE code WHEN 'mugnee' THEN 'MUG' WHEN 'renex' THEN 'REN' ELSE 'SAS' END,
       15,
       jsonb_build_object('companyCode', code)
FROM companies WHERE code IN ('mugnee', 'renex', 'sasha')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO invoice_settings (company_id, invoice_prefix, template_key)
SELECT id,
       CASE code WHEN 'mugnee' THEN 'MUG-INV' WHEN 'renex' THEN 'REN-INV' ELSE 'SAS-INV' END,
       CASE code WHEN 'mugnee' THEN 'mugnee-default' WHEN 'renex' THEN 'renex-default' ELSE 'sasha-default' END
FROM companies WHERE code IN ('mugnee', 'renex', 'sasha')
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO calculator_settings (company_id, calculator_type, settings)
SELECT c.id, calculator_type, '{}'::jsonb
FROM companies c
CROSS JOIN (VALUES ('fixed-led'), ('rental-led'), ('pa-system'), ('conference-system')) AS types(calculator_type)
WHERE c.code IN ('mugnee', 'renex', 'sasha')
ON CONFLICT (company_id, calculator_type) DO NOTHING;

COMMIT;
