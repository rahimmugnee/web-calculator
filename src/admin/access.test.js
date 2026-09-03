import { isPrivilegedAdmin, isPrivilegedAdminPath } from "./access";

test.each([
  [{ role: "super-admin" }, true],
  [{ role_name: "Super Admin" }, true],
  [{ role: "admin" }, true],
  [{ role_name: "Admin" }, true],
  [{ role: "sales" }, false],
  [{ role: "accounts" }, false],
  [{ role: "viewer" }, false],
])("checks privileged admin roles", (user, expected) => {
  expect(isPrivilegedAdmin(user)).toBe(expected);
});

test("restricts the Companies and Users & Roles routes", () => {
  expect(isPrivilegedAdminPath("/admin/companies")).toBe(true);
  expect(isPrivilegedAdminPath("/admin/users")).toBe(true);
  expect(isPrivilegedAdminPath("/admin/categories")).toBe(false);
});
