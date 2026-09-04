function product({ sourceKey, category, componentType, name, brand, model, unit = "Nos.", currency = "BDT", metadata, prices }) {
  return { sourceKey, sku: sourceKey, category, componentType, name, brand, model, unit, currency, metadata, prices };
}

function moduleProductName(module, location) {
  const pitch = String(module.name || "").replace(/^P\s*/i, "").trim();
  return `P ${pitch} ${String(location).toLowerCase()} LED Display Module`;
}

function componentModelName(model, label, internalId) {
  const clean = (value) => String(value || "")
    .replace(/^(?:Controller|Receiving Card|Video Processor)\s*:\s*/i, "")
    .trim();
  const candidate = String(model || "").trim();
  const isInternalId = candidate && candidate.toLowerCase() === String(internalId || "").trim().toLowerCase();
  return isInternalId ? clean(label) : clean(candidate) || clean(label);
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
          const brandModelName = ledCatalog.moduleBrandModelNames?.[brand]?.[module.id] || module.name;
          const goldAdjustment = ledCatalog.moduleBrandGoldAdjustments?.[brand];
          const explicitPrices = ledCatalog.moduleBrandPrices?.[brand]?.[module.id];
          const explicitBasePrice = explicitPrices?.default ?? explicitPrices?.gold;
          const moduleBasePrice = Number(module.prices?.default ?? module.prices?.gold ?? 0);
          const prices = brand === "Lampro"
            ? { default: moduleBasePrice }
            : explicitBasePrice !== undefined ? { default: Number(explicitBasePrice) } : (goldAdjustment !== undefined
              ? { default: moduleBasePrice + Number(goldAdjustment) }
              : undefined);
          if (!prices) continue;
          rows.push(product({
            sourceKey: `led:module:${brand.toLowerCase()}:${module.id}`,
            category: "led-module", componentType: "module", name: moduleProductName(module, location),
            brand, model: brandModelName, unit: "Pcs", metadata: { ...module, prices: undefined, technology, location }, prices,
          }));
        }
      }
    }
  }

  for (const controller of [...(ledCatalog.controllers || []), ...(ledCatalog.novastarControllers || [])]) {
    const brand = String(controller.id || "").startsWith("NS_") ? "Novastar" : "Huidu";
    rows.push(product({ sourceKey: `led:controller:${controller.id}`, category: "led-controller", componentType: "controller", name: controller.label, brand, model: componentModelName(controller.model, controller.label, controller.id), unit: "Pcs", metadata: controller, prices: { default: controller.price } }));
  }
  for (const [id, card] of Object.entries(ledCatalog.receivingCards || {})) {
    const prices = { default: card.unitPrice };
    if (card.cobUnitPrice !== undefined) prices.cob = card.cobUnitPrice;
    const brand = String(id).startsWith("NS_") ? "Novastar" : "Huidu";
    rows.push(product({ sourceKey: `led:receiving-card:${id}`, category: "receiving-card", componentType: "receiving-card", name: card.label, brand, model: componentModelName(card.model, card.label, id), unit: "Pcs", metadata: card, prices }));
  }
  for (const cabinet of ledCatalog.cabinetOptions || []) {
    if (cabinet.catalogRole === "model" || (cabinet.sourceCatalog === "admin" && cabinet.catalogRole !== "base")) continue;
    rows.push(product({ sourceKey: `led:cabinet:${cabinet.id}`, category: "led-cabinet", componentType: "cabinet", name: `${cabinet.materialLabel} ${cabinet.variantLabel || ""} ${cabinet.label}`.replace(/\s+/g, " ").trim(), model: cabinet.model || null, unit: "Pcs", metadata: { ...cabinet, model: cabinet.model || "" }, prices: { default: cabinet.price } }));
  }
  for (const supply of ledCatalog.powerSupplies || []) {
    const model = componentModelName(supply.model, supply.label, supply.id) || "LED Power Supply";
    rows.push(product({
      sourceKey: `led:power-supply:${supply.id}`,
      category: "power-supply",
      componentType: "power-supply",
      name: supply.itemName || supply.label || `Power Supply: ${model}`,
      brand: supply.brand || null,
      model,
      unit: supply.unit || "Pcs",
      metadata: supply,
      prices: { default: supply.price },
    }));
  }

  for (const item of paProducts || []) {
    rows.push(product({ sourceKey: `pa:${item.id}`, category: "pa-system", componentType: item.componentType, name: item.productName, brand: item.brand, model: item.model, unit: item.unit, currency: item.currency, metadata: item, prices: { default: item.unitPrice } }));
  }
  for (const item of conferenceProducts || []) {
    rows.push(product({ sourceKey: `conference:${item.id}`, category: "conference-system", componentType: item.componentType, name: item.productName, brand: item.brand, model: item.model, unit: item.unit, currency: item.currency, metadata: item, prices: { default: item.unitPrice } }));
  }

  return rows.map((row) => ({ ...row, metadata: Object.fromEntries(Object.entries(row.metadata || {}).filter(([, value]) => value !== undefined)) }));
}
