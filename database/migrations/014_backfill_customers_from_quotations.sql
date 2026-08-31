WITH raw_contacts AS (
  SELECT
    q.company_id,
    COALESCE(NULLIF(btrim(q.client_name), ''), NULLIF(btrim(q.client_information->>'name'), '')) AS name,
    NULLIF(btrim(COALESCE(q.client_information->>'company', q.client_information->>'organization')), '') AS organization,
    NULLIF(btrim(COALESCE(q.client_information->>'position', q.client_information->>'designation')), '') AS designation,
    NULLIF(btrim(COALESCE(q.client_information->>'mobile', q.client_information->>'phone')), '') AS phone,
    NULLIF(btrim(q.client_information->>'email'), '') AS email,
    NULLIF(btrim(q.client_information->>'address'), '') AS address,
    q.created_at
  FROM quotations q
  WHERE q.deleted_at IS NULL
),
latest_contacts AS (
  SELECT DISTINCT ON (company_id, lower(name), lower(COALESCE(organization, '')))
    company_id, name, organization, designation, phone, email, address
  FROM raw_contacts
  WHERE name IS NOT NULL
  ORDER BY company_id, lower(name), lower(COALESCE(organization, '')), created_at DESC
)
INSERT INTO customers (company_id, name, organization, designation, phone, email, address, notes, is_active)
SELECT company_id, name, organization, designation, phone, email, address, 'Created from quotation history', true
FROM latest_contacts contact
WHERE NOT EXISTS (
  SELECT 1 FROM customers customer
  WHERE customer.company_id=contact.company_id
    AND lower(customer.name)=lower(contact.name)
    AND lower(COALESCE(customer.organization, ''))=lower(COALESCE(contact.organization, ''))
);
