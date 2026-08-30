import test from "node:test";
import assert from "node:assert/strict";
import { idValue, moneyValue, slugValue } from "./validation.mjs";

test("validates identifiers and non-negative prices", () => {
  assert.equal(idValue("12"), 12);
  assert.equal(moneyValue("1250.50"), 1250.5);
  assert.throws(() => moneyValue(-1), /non-negative/);
});

test("accepts safe slugs and rejects arbitrary text", () => {
  assert.equal(slugValue("conference-system"), "conference-system");
  assert.throws(() => slugValue("Conference System"), /lowercase/);
});
