BEGIN;

UPDATE products
SET source_key = replace(source_key, 'led:controller:NS_DSP', 'led:controller:NS_VX'),
    sku = replace(COALESCE(sku, source_key), 'led:controller:NS_DSP', 'led:controller:NS_VX'),
    name = CASE technical_metadata->>'id'
      WHEN 'NS_DSP400' THEN 'Video Processor: VX400 Pro'
      WHEN 'NS_DSP600' THEN 'Video Processor: VX600 Pro'
      WHEN 'NS_DSP1000' THEN 'Video Processor: VX1000 Pro'
      WHEN 'NS_DSP2000' THEN 'Video Processor: VX2000 Pro'
    END,
    model = CASE technical_metadata->>'id'
      WHEN 'NS_DSP400' THEN 'VX400 Pro'
      WHEN 'NS_DSP600' THEN 'VX600 Pro'
      WHEN 'NS_DSP1000' THEN 'VX1000 Pro'
      WHEN 'NS_DSP2000' THEN 'VX2000 Pro'
    END,
    technical_metadata = jsonb_set(
      jsonb_set(
        jsonb_set(technical_metadata, '{id}', to_jsonb(replace(technical_metadata->>'id', 'NS_DSP', 'NS_VX'))),
        '{label}',
        to_jsonb(CASE technical_metadata->>'id'
          WHEN 'NS_DSP400' THEN 'Video Processor: VX400 Pro'
          WHEN 'NS_DSP600' THEN 'Video Processor: VX600 Pro'
          WHEN 'NS_DSP1000' THEN 'Video Processor: VX1000 Pro'
          WHEN 'NS_DSP2000' THEN 'Video Processor: VX2000 Pro'
        END)
      ),
      '{model}',
      to_jsonb(CASE technical_metadata->>'id'
        WHEN 'NS_DSP400' THEN 'VX400 Pro'
        WHEN 'NS_DSP600' THEN 'VX600 Pro'
        WHEN 'NS_DSP1000' THEN 'VX1000 Pro'
        WHEN 'NS_DSP2000' THEN 'VX2000 Pro'
      END)
    )
WHERE source_key IN (
  'led:controller:NS_DSP400',
  'led:controller:NS_DSP600',
  'led:controller:NS_DSP1000',
  'led:controller:NS_DSP2000'
);

COMMIT;
