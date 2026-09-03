UPDATE products p
SET name = concat(
  'P ',
  regexp_replace(trim(p.technical_metadata->>'name'), '^P[[:space:]]*', '', 'i'),
  ' ',
  lower(COALESCE(NULLIF(trim(p.technical_metadata->>'location'), ''), 'indoor')),
  ' LED Display Module'
)
FROM categories c
WHERE p.category_id = c.id
  AND c.system_type = 'led-display'
  AND c.slug = 'led-module'
  AND NULLIF(trim(p.technical_metadata->>'name'), '') IS NOT NULL;
