import test from "node:test";
import assert from "node:assert/strict";
import { emailValue, idValue, moneyValue, slugSegment, slugValue } from "./validation.mjs";

test("validates identifiers and non-negative prices", () => {
  assert.equal(idValue("12"), 12);
  assert.equal(moneyValue("1250.50"), 1250.5);
  assert.throws(() => moneyValue(-1), /non-negative/);
});

test("accepts safe slugs and rejects arbitrary text", () => {
  assert.equal(slugValue("conference-system"), "conference-system");
  assert.throws(() => slugValue("Conference System"), /lowercase/);
});

test("creates a safe source-key segment from a product model or label", () => {
  assert.equal(slugSegment(" CAB-X Premium "), "cab-x-premium");
  assert.equal(slugSegment(""), "item");
});

test("normalizes valid emails and rejects invalid addresses", () => {
  assert.equal(emailValue(" Rahim.Mugnee@Gmail.com "), "rahim.mugnee@gmail.com");
  assert.throws(() => emailValue("not-an-email"), /invalid/);
});
