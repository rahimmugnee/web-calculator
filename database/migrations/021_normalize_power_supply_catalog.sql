WITH normalized(old_key, new_key, item_id, brand_name, model_name, item_label) AS (
  VALUES
    ('led:power-supply:default',   'led:power-supply:PS_LD200',    'PS_LD200',    'Lampro',    'LD-200',    'Power Supply: LD-200'),
    ('led:power-supply:mean-well','led:power-supply:PS_LRS200',   'PS_LRS200',   'Mean well', 'LRS-200',   'Power Supply: LRS-200'),
    ('led:power-supply:g-energy', 'led:power-supply:PS_N200V5A', 'PS_N200V5A', 'G-Energy',  'N200V5-A', 'Power Supply: N200V5-A')
)
UPDATE products AS product
SET source_key = normalized.new_key,
    sku = normalized.new_key,
    name = normalized.item_label,
    brand = normalized.brand_name,
    model = normalized.model_name,
    unit = 'Pcs',
    technical_metadata = COALESCE(product.technical_metadata, '{}'::jsonb) || jsonb_build_object(
      'id', normalized.item_id,
      'brand', normalized.brand_name,
      'model', normalized.model_name,
      'label', normalized.item_label,
      'itemName', normalized.item_label,
      'unit', 'Pcs'
    )
FROM normalized
WHERE product.source_key = normalized.old_key;
