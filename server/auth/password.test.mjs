import test from "node:test";
import assert from "node:assert/strict";
import { hashPassword, verifyPassword } from "./password.mjs";

test("scrypt password hashes verify without containing the password", async () => {
  const password = "Admin@2026";
  const hash = await hashPassword(password);
  assert.match(hash, /^scrypt\$/);
  assert.equal(hash.includes(password), false);
  assert.equal(await verifyPassword(password, hash), true);
  assert.equal(await verifyPassword("wrong-password", hash), false);
});

test("rejects short passwords", async () => {
  await assert.rejects(() => hashPassword("12345"), /at least 6/);
});
