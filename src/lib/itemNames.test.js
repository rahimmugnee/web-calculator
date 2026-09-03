import { powerSupplyItemName, withoutLedTechnology } from "./itemNames.js";

test.each(["SMD", "COB", "GOB"])("removes %s from an LED module item name", (technology) => {
  expect(withoutLedTechnology(`P 1.25 ${technology} indoor LED Display Module`))
    .toBe("P 1.25 indoor LED Display Module");
});

test("removes a parenthesized technology label without leaving empty parentheses", () => {
  expect(withoutLedTechnology("P 1.25 Indoor (COB) LED Display Module"))
    .toBe("P 1.25 Indoor LED Display Module");
});

test("prefixes a power supply label exactly once", () => {
  expect(powerSupplyItemName("LD-200", "LD-200")).toBe("Power Supply: LD-200");
  expect(powerSupplyItemName("Power Supply: LD-200", "LD-200")).toBe("Power Supply: LD-200");
});
