// ===============================
// src/data/models.js
// ===============================
// Re-exports use the bundled component catalog; live database values are applied by CatalogContext.

import { defaultQuotationCatalog } from "./defaultQuotationCatalog.js";

export const MODEL_GROUPS = defaultQuotationCatalog.modelGroups;
export const CONTROLLERS = defaultQuotationCatalog.controllers;
export const POWER_SUPPLIES = defaultQuotationCatalog.powerSupplies;
export const POWER_SUPPLY_PRICE = defaultQuotationCatalog.powerSupplies?.[0]?.price || 0;
