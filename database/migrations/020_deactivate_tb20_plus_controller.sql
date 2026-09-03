UPDATE company_product_prices
SET is_active = false
WHERE product_id IN (
  SELECT id
  FROM products
  WHERE source_key = 'led:controller:NS_TB2'
);

UPDATE products
SET is_active = false
WHERE source_key = 'led:controller:NS_TB2';
