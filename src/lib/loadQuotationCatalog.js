import { componentPrice } from "../data/componentPrice.js";
import { deepMerge } from "./deepMerge.js";

const CATALOG_URL = process.env.REACT_APP_QUOTATION_CATALOG_URL || "/quotation-catalog.json";

export async function loadQuotationCatalog() {
  let remote = null;
  try {
    const res = await fetch(CATALOG_URL, { cache: "no-store" });
    if (res.ok) {
      try {
        remote = await res.json();
      } catch {
        remote = null;
      }
    }
  } catch {
    remote = null;
  }
  if (!remote || typeof remote !== "object") {
    return { catalog: componentPrice, fromRemote: false };
  }
  return { catalog: deepMerge(componentPrice, remote), fromRemote: true };
}
