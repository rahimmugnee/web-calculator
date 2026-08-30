export const routePath = () => window.location.pathname.replace(/\/$/, "") || "/";
export function navigate(path) { if (window.location.pathname !== path) window.history.pushState({}, "", path); window.dispatchEvent(new PopStateEvent("popstate")); }
