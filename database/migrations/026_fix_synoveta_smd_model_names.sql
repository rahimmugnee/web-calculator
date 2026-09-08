BEGIN;

UPDATE products
SET model = CASE technical_metadata->>'id'
  WHEN 'smd-in-p1_25' THEN 'SVC 1.25P'
  WHEN 'smd-in-p1_53' THEN 'SVC 1.53P'
  WHEN 'smd-in-p1_86' THEN 'SVC 1.86P'
END
WHERE source_key IN (
  'led:module:synoveta:smd-in-p1_25',
  'led:module:synoveta:smd-in-p1_53',
  'led:module:synoveta:smd-in-p1_86'
);

COMMIT;
