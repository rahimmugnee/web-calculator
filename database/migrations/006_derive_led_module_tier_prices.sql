DELETE FROM company_product_prices AS cpp
USING products AS p, categories AS c
WHERE cpp.product_id = p.id
  AND p.category_id = c.id
  AND c.slug = 'led-module'
  AND cpp.price_tier IN ('platinum', 'diamond');
