BEGIN;

ALTER TABLE quotations
  ADD COLUMN IF NOT EXISTS created_by_user_id bigint REFERENCES users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS quotations_created_by_user_idx
  ON quotations(created_by_user_id);

COMMIT;
