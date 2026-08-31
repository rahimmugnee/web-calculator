import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback);
const KEY_LENGTH = 64;
const COST = 16384;

export async function hashPassword(password) {
  if (typeof password !== "string" || password.length < 6) throw new TypeError("Password must be at least 6 characters");
  const salt = randomBytes(16).toString("hex");
  const derived = await scrypt(password, salt, KEY_LENGTH, { N: COST, r: 8, p: 1 });
  return `scrypt$${COST}$8$1$${salt}$${Buffer.from(derived).toString("hex")}`;
}

export async function verifyPassword(password, storedHash) {
  try {
    const [algorithm, n, r, p, salt, expectedHex] = String(storedHash).split("$");
    if (algorithm !== "scrypt") return false;
    const actual = Buffer.from(await scrypt(password, salt, expectedHex.length / 2, { N: Number(n), r: Number(r), p: Number(p) }));
    const expected = Buffer.from(expectedHex, "hex");
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
