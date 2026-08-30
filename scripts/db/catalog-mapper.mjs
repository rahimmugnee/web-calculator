function product({ sourceKey, category, componentType, name, brand, model, unit = "Nos.", currency = "BDT", metadata, prices }) {
  return { sourceKey, sku: sourceKey, category, componentType, name, brand, model, unit, currency, metadata, prices };
}

export function mapStaticCatalog({ ledCatalog, paProducts, conferenceProducts }) {
  const rows = [];

  for (const [technology, locations] of Object.entries(ledCatalog.modelGroups || {})) {
    for (const [location, modules] of Object.entries(locations)) {
      for (const module of modules) {
        const brands = new Set([
          "Lampro",
          ...Object.keys(ledCatalog.moduleBrandPrices || {}),
          ...Object.keys(ledCatalog.moduleBrandGoldAdjustments || {}),
        ]);
        for (const brand of brands) {
          const goldAdjustment = ledCatalog.moduleBrandGoldAdjustments?.[brand];
          const prices = brand === "Lampro"
            ? module.prices
            : goldAdjustment !== undefined
              ? { gold: Number(module.prices?.gold || 0) + Number(goldAdjustment) }
              : ledCatalog.moduleBrandPrices?.[brand]?.[module.id];
          if (!prices) continue;
          rows.push(product({
            sourceKey: `led:module:${brand.toLowerCase()}:${module.id}`,
            category: "led-module", componentType: "module", name: `${module.name} ${technology.toUpperCase()} ${location} LED Module`,
            brand, model: module.name, unit: "Module", metadata: { ...module, prices: undefined, technology, location }, prices,
          }));
        }
      }
    }
  }

  for (const controller of [...(ledCatalog.controllers || []), ...(ledCatalog.novastarControllers || [])]) {
    const brand = String(controller.id || "").startsWith("NS_") ? "Novastar" : "Huidu";
    rows.push(product({ sourceKey: `led:controller:${controller.id}`, category: "led-controller", componentType: "controller", name: controller.label, brand, model: controller.id, metadata: controller, prices: { default: controller.price } }));
  }
  for (const [id, card] of Object.entries(ledCatalog.receivingCards || {})) {
    const prices = { default: card.unitPrice };
    if (card.cobUnitPrice !== undefined) prices.cob = card.cobUnitPrice;
    const brand = String(id).startsWith("NS_") ? "Novastar" : "Huidu";
    rows.push(product({ sourceKey: `led:receiving-card:${id}`, category: "receiving-card", componentType: "receiving-card", name: card.label, brand, model: id, metadata: card, prices }));
  }
  for (const cabinet of ledCatalog.cabinetOptions || []) {
    rows.push(product({ sourceKey: `led:cabinet:${cabinet.id}`, category: "led-cabinet", componentType: "cabinet", name: `${cabinet.materialLabel} ${cabinet.variantLabel || ""} ${cabinet.label}`.replace(/\s+/g, " ").trim(), model: cabinet.id, unit: "Cabinet", metadata: cabinet, prices: { default: cabinet.price } }));
  }
  for (const [index, brandOption] of (ledCatalog.powerSupplyBrands || ["Lampro"]).entries()) {
    const brand = typeof brandOption === "string" ? brandOption : brandOption.value;
    const sourceKey = index === 0 ? "led:power-supply:default" : `led:power-supply:${String(brand).toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    rows.push(product({ sourceKey, category: "power-supply", componentType: "power-supply", name: ledCatalog.psuModelLabel || "LED Power Supply", brand, model: ledCatalog.psuModelLabel, metadata: { brand }, prices: { default: ledCatalog.powerSupplyPrice } }));
  }

  for (const item of paProducts || []) {
    rows.push(product({ sourceKey: `pa:${item.id}`, category: "pa-system", componentType: item.componentType, name: item.productName, brand: item.brand, model: item.model, unit: item.unit, currency: item.currency, metadata: item, prices: { default: item.unitPrice } }));
  }
  for (const item of conferenceProducts || []) {
    rows.push(product({ sourceKey: `conference:${item.id}`, category: "conference-system", componentType: item.componentType, name: item.productName, brand: item.brand, model: item.model, unit: item.unit, currency: item.currency, metadata: item, prices: { default: item.unitPrice } }));
  }

  return rows.map((row) => ({ ...row, metadata: Object.fromEntries(Object.entries(row.metadata || {}).filter(([, value]) => value !== undefined)) }));
}
