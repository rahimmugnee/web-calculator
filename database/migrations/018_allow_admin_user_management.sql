INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.code = 'manage_users'
WHERE r.code = 'admin'
ON CONFLICT DO NOTHING;
