// ===============================
// src/data/models.js
// ===============================
// Re-exports match bundled defaults; live app + mobile should use /quotation-catalog.json via CatalogContext / fetch.

import { defaultQuotationCatalog } from "./defaultQuotationCatalog.js";

export const MODEL_GROUPS = defaultQuotationCatalog.modelGroups;
export const CONTROLLERS = defaultQuotationCatalog.controllers;
export const POWER_SUPPLIES = defaultQuotationCatalog.powerSupplies;
export const POWER_SUPPLY_PRICE = defaultQuotationCatalog.powerSupplies?.[0]?.price || 0;
