import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { componentModelAndPrice } from "../src/data/component-model-and-price.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "quotation-catalog.json");
writeFileSync(out, JSON.stringify(componentModelAndPrice, null, 2), "utf8");
console.log("Wrote", out);
