BEGIN;

ALTER TABLE quotations ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
CREATE INDEX IF NOT EXISTS quotations_deleted_at_idx ON quotations (deleted_at) WHERE deleted_at IS NOT NULL;

COMMIT;
