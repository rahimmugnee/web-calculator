UPDATE companies
SET name = 'Mugnee Multiple Limited',
    updated_at = CURRENT_TIMESTAMP
WHERE code = 'mugnee'
  AND name IS DISTINCT FROM 'Mugnee Multiple Limited';
