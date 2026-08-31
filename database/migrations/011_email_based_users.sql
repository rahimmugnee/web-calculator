BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email text;

UPDATE users
SET email = CASE
  WHEN username LIKE '%@%' THEN lower(username)
  ELSE lower(username) || '@mugnee.local'
END
WHERE email IS NULL OR btrim(email) = '';

WITH primary_super_admin AS (
  SELECT u.id
  FROM users u
  JOIN roles r ON r.id = u.role_id
  WHERE r.code = 'super-admin'
  ORDER BY u.id
  LIMIT 1
)
UPDATE users u
SET email = 'rahim.mugnee@gmail.com'
FROM primary_super_admin admin
WHERE u.id = admin.id;

ALTER TABLE users ALTER COLUMN email SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (lower(email));

COMMIT;
