import { getTierPriceFromGold } from "./tierPricing";

test("calculates Platinum as 15% more than Gold", () => {
  expect(getTierPriceFromGold(1000, "platinum")).toBe(1150);
});

test("calculates Diamond as 25% more than Gold", () => {
  expect(getTierPriceFromGold(1000, "diamond")).toBe(1250);
});

test("keeps Gold unchanged and safely handles an invalid price", () => {
  expect(getTierPriceFromGold(1000, "gold")).toBe(1000);
  expect(getTierPriceFromGold("not-a-price", "diamond")).toBe(0);
});
