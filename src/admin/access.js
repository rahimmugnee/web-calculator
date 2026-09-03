const privilegedAdminRoles = new Set(["super-admin", "admin"]);

export function isPrivilegedAdmin(user) {
  const role = String(user?.role || user?.role_name || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  return privilegedAdminRoles.has(role);
}

export function isPrivilegedAdminPath(path) {
  return path === "/admin/companies" || path === "/admin/users";
}
