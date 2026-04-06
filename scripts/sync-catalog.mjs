import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { defaultQuotationCatalog } from "../src/data/defaultQuotationCatalog.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "quotation-catalog.json");
writeFileSync(out, JSON.stringify(defaultQuotationCatalog, null, 2), "utf8");
console.log("Wrote", out);
