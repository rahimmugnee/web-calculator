BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS pricing_source_company_id bigint REFERENCES companies(id) ON DELETE RESTRICT;

INSERT INTO companies (
  name, code, is_default, is_active, currency, vat_defaults,
  signatory_name, signatory_designation, signatory_company_name,
  signatory_phone, signatory_email, pricing_source_company_id
)
SELECT
  'Mugnee Multiple', 'mugnee-multiple', false, true, currency, vat_defaults,
  signatory_name, signatory_designation, 'Mugnee Multiple',
  signatory_phone, signatory_email, id
FROM companies
WHERE code = 'mugnee'
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  is_active = true,
  pricing_source_company_id = EXCLUDED.pricing_source_company_id;

INSERT INTO quotation_settings (
  company_id, quotation_prefix, header_information, footer_information, terms,
  branding, default_validity_days, default_delivery_period
)
SELECT target.id, source.quotation_prefix, source.header_information,
       source.footer_information, source.terms, source.branding,
       source.default_validity_days, source.default_delivery_period
FROM companies target
JOIN companies original ON original.code = 'mugnee'
JOIN quotation_settings source ON source.company_id = original.id
WHERE target.code = 'mugnee-multiple'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO invoice_settings (company_id, invoice_prefix, template_key, settings)
SELECT target.id, source.invoice_prefix, source.template_key, source.settings
FROM companies target
JOIN companies original ON original.code = 'mugnee'
JOIN invoice_settings source ON source.company_id = original.id
WHERE target.code = 'mugnee-multiple'
ON CONFLICT (company_id) DO NOTHING;

INSERT INTO calculator_settings (company_id, calculator_type, settings, is_active)
SELECT target.id, source.calculator_type, source.settings, source.is_active
FROM companies target
JOIN companies original ON original.code = 'mugnee'
JOIN calculator_settings source ON source.company_id = original.id
WHERE target.code = 'mugnee-multiple'
ON CONFLICT (company_id, calculator_type) DO NOTHING;

COMMIT;
