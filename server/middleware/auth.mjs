import { CSRF_COOKIE, parseCookies, SESSION_COOKIE, sha256 } from "../auth/session.mjs";
import { getPool } from "../db/pool.mjs";

export async function requireAuth(req, res, next) {
  const cookies = parseCookies(req.headers.cookie);
  if (!cookies[SESSION_COOKIE]) return res.status(401).json({ error: "Authentication required." });
  const result = await getPool().query(
    `SELECT s.id session_id,s.csrf_token_hash,s.expires_at,u.id,u.email,u.display_name,u.is_active,
       r.code AS "role",r.name role_name,COALESCE(array_agg(p.code) FILTER (WHERE p.code IS NOT NULL),'{}') permissions
     FROM auth_sessions s JOIN users u ON u.id=s.user_id JOIN roles r ON r.id=u.role_id
     LEFT JOIN role_permissions rp ON rp.role_id=r.id LEFT JOIN permissions p ON p.id=rp.permission_id
     WHERE s.token_hash=$1 AND s.expires_at>now() GROUP BY s.id,u.id,r.id`, [sha256(cookies[SESSION_COOKIE])]
  );
  const user = result.rows[0];
  if (!user?.is_active) return res.status(401).json({ error: "Session expired." });
  req.user = user;
  req.cookies = cookies;
  getPool().query("UPDATE auth_sessions SET last_seen_at=now() WHERE id=$1", [user.session_id]).catch(() => {});
  next();
}

export function requireCsrf(req, res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const token = req.get("x-csrf-token");
  if (!token || token !== req.cookies?.[CSRF_COOKIE] || sha256(token) !== req.user.csrf_token_hash) {
    return res.status(403).json({ error: "Security token is invalid. Refresh and try again." });
  }
  next();
}

export const requirePermission = (permission) => (req, res, next) =>
  req.user.permissions.includes(permission) ? next() : res.status(403).json({ error: "You do not have permission for this action." });
