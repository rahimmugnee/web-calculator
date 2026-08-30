const API_BASE = process.env.REACT_APP_ADMIN_API_URL || "/api";

function announceAdminChange(path) {
  const message = { type: "calculator-admin-change", path, at: Date.now() };
  try { const channel = new BroadcastChannel("calculator-live-updates"); channel.postMessage(message); channel.close(); } catch {}
  try { window.localStorage.setItem("calculatorLiveUpdate", JSON.stringify(message)); } catch {}
  window.dispatchEvent(new CustomEvent("calculator-admin-change", { detail: message }));
}

function cookie(name) {
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

export async function api(path, options = {}) {
  const headers = { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers };
  if (options.method && !["GET", "HEAD"].includes(options.method)) headers["X-CSRF-Token"] = decodeURIComponent(cookie("calculator_admin_csrf"));
  const response = await fetch(`${API_BASE}${path}`, { credentials: "include", ...options, headers, body: options.body ? JSON.stringify(options.body) : undefined });
  const data = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw Object.assign(new Error(data?.error || "Request failed."), { status: response.status });
  if (options.method && !["GET", "HEAD"].includes(options.method)) announceAdminChange(path);
  return data;
}

export const get = (path) => api(path);
export const post = (path, body) => api(path, { method: "POST", body });
export const put = (path, body) => api(path, { method: "PUT", body });
export const patch = (path, body) => api(path, { method: "PATCH", body });
export const remove = (path) => api(path, { method: "DELETE" });
