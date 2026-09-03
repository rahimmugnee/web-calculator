BEGIN;

ALTER TABLE products ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE brands ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS deleted_at timestamptz;

CREATE INDEX IF NOT EXISTS products_deleted_at_idx ON products (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS brands_deleted_at_idx ON brands (deleted_at) WHERE deleted_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS categories_deleted_at_idx ON categories (deleted_at) WHERE deleted_at IS NOT NULL;

COMMIT;
