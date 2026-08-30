BEGIN;

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

COMMIT;
