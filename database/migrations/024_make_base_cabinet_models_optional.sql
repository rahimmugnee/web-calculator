BEGIN;

UPDATE products
SET model = NULL,
    technical_metadata = jsonb_set(
      COALESCE(technical_metadata, '{}'::jsonb),
      '{model}',
      '""'::jsonb,
      true
    )
WHERE component_type = 'cabinet'
  AND source_catalog <> 'admin';

COMMIT;
