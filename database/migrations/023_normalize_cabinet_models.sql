BEGIN;

WITH cabinet_models AS (
  SELECT id,
    (CASE lower(COALESCE(technical_metadata->>'materialCode', technical_metadata->>'materialLabel', ''))
      WHEN 'mild_steel' THEN 'MS'
      WHEN 'mild steel' THEN 'MS'
      WHEN 'aluminium' THEN 'AL'
      WHEN 'aluminum' THEN 'AL'
      WHEN 'magnesium' THEN 'MG'
      ELSE upper(left(regexp_replace(COALESCE(technical_metadata->>'materialLabel', 'CB'), '[^A-Za-z]', '', 'g'), 2))
    END)
    || upper(COALESCE(
      NULLIF(technical_metadata->>'sizeKey', ''),
      concat(technical_metadata->>'widthMm', 'x', technical_metadata->>'heightMm')
    )) AS normalized_model
  FROM products
  WHERE component_type='cabinet'
    AND source_catalog <> 'admin'
), updated AS (
  UPDATE products p
  SET model=c.normalized_model,
      technical_metadata=jsonb_set(COALESCE(p.technical_metadata, '{}'::jsonb), '{model}', to_jsonb(c.normalized_model), true)
  FROM cabinet_models c
  WHERE p.id=c.id
  RETURNING p.id
)
SELECT count(*) AS updated_cabinet_models FROM updated;

COMMIT;
