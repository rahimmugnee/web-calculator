import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { componentModelAndPrice } from "../../src/data/component-model-and-price.js";
import { paProducts } from "../../src/data/paProducts.js";
import { conferenceProducts } from "../../src/data/conferenceProducts.js";
import { mapStaticCatalog } from "./catalog-mapper.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const output = join(root, "database", "generated", "mugnee-static-catalog.json");
const products = mapStaticCatalog({ ledCatalog: componentModelAndPrice, paProducts, conferenceProducts });
mkdirSync(dirname(output), { recursive: true });
writeFileSync(output, JSON.stringify({ schemaVersion: 1, companyCode: "mugnee", generatedAt: new Date().toISOString(), products }, null, 2));
console.log(`Exported ${products.length} products to ${output}`);
