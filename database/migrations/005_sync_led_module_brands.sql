INSERT INTO brands(name,slug,is_active)
VALUES ('Absen','absen',true)
ON CONFLICT(slug) DO UPDATE SET name=EXCLUDED.name,is_active=true;

INSERT INTO category_brands(category_id,brand_id,is_active)
SELECT c.id,b.id,true
FROM categories c
JOIN brands b ON b.slug='absen'
WHERE c.slug='led-module'
ON CONFLICT(category_id,brand_id) DO UPDATE SET is_active=true;
