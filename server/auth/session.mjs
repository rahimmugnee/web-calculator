import { createHash, randomBytes, randomUUID } from "node:crypto";

export const SESSION_COOKIE = "calculator_admin_session";
export const CSRF_COOKIE = "calculator_admin_csrf";
export const sha256 = (value) => createHash("sha256").update(String(value)).digest("hex");
export const newToken = () => randomBytes(32).toString("base64url");

export function parseCookies(header = "") {
  return Object.fromEntries(header.split(";").map((part) => part.trim()).filter(Boolean).map((part) => {
    const index = part.indexOf("=");
    return [decodeURIComponent(part.slice(0, index)), decodeURIComponent(part.slice(index + 1))];
  }));
}

export async function createSession(client, userId, { remember, userAgent, ipAddress }) {
  const token = newToken();
  const csrfToken = newToken();
  const hours = remember ? Number(process.env.AUTH_REMEMBER_DAYS || 30) * 24 : Number(process.env.AUTH_SESSION_HOURS || 12);
  const expiresAt = new Date(Date.now() + hours * 3600000);
  await client.query(
    `INSERT INTO auth_sessions (id,user_id,token_hash,csrf_token_hash,expires_at,user_agent,ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [randomUUID(), userId, sha256(token), sha256(csrfToken), expiresAt, userAgent || null, ipAddress || null]
  );
  return { token, csrfToken, expiresAt, remember };
}

export function setSessionCookies(res, session) {
  const secure = process.env.NODE_ENV === "production";
  const base = { secure, sameSite: "strict", path: "/" };
  res.cookie(SESSION_COOKIE, session.token, { ...base, httpOnly: true, expires: session.expiresAt });
  res.cookie(CSRF_COOKIE, session.csrfToken, { ...base, httpOnly: false, expires: session.expiresAt });
}

export function clearSessionCookies(res) {
  const secure = process.env.NODE_ENV === "production";
  res.clearCookie(SESSION_COOKIE, { secure, sameSite: "strict", path: "/" });
  res.clearCookie(CSRF_COOKIE, { secure, sameSite: "strict", path: "/" });
}
