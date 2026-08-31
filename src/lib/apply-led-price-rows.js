const cloneCatalog = (catalog) => JSON.parse(JSON.stringify(catalog || {}));
const brandValue = (brand) => typeof brand === "string" ? brand : brand?.value;
const basePriceComponents = new Set(["module", "controller", "cabinet", "power-supply"]);
const basePriceTiers = new Set(["default", "gold"]);

const basePriceIdentity = (row) => [
  row.component_type,
  row.brand_name || "",
  row.source_key || row.technical_metadata?.id || row.model || "",
].map(String).join("\u0000");

function preferredBasePriceRows(rows) {
  const preferred = new Map();
  for (const row of rows) {
    if (!basePriceComponents.has(row.component_type) || !basePriceTiers.has(row.price_tier)) continue;
    if (!Number.isFinite(Number(row.unit_price))) continue;
    const identity = basePriceIdentity(row);
    const current = preferred.get(identity);
    if (!current || (current.price_tier === "gold" && row.price_tier === "default")) {
      preferred.set(identity, row);
    }
  }
  return preferred;
}

export function applyLedPriceRows(baseCatalog, rows = [], brandRows = []) {
  const catalog = cloneCatalog(baseCatalog);
  catalog.modelGroups ||= {};
  catalog.moduleBrandPrices ||= {};
  for (const locations of Object.values(catalog.modelGroups)) {
    for (const models of Object.values(locations || {})) {
      for (const model of models || []) {
        const basePrice = model.prices?.default ?? model.prices?.gold;
        model.prices = Number.isFinite(Number(basePrice)) ? { default: Number(basePrice) } : {};
      }
    }
  }
  for (const [brand, models] of Object.entries(catalog.moduleBrandPrices)) {
    catalog.moduleBrandPrices[brand] = Object.fromEntries(Object.entries(models || {}).map(([id, prices]) => {
      const basePrice = prices?.default ?? prices?.gold;
      return [id, Number.isFinite(Number(basePrice)) ? { default: Number(basePrice) } : {}];
    }));
  }

  const controllers = [...(catalog.controllers || [])];
  const novastarControllers = [...(catalog.novastarControllers || [])];
  const receivingCards = { ...(catalog.receivingCards || {}) };
  const cabinetOptions = [...(catalog.cabinetOptions || [])];
  const powerSupplyPrices = Object.fromEntries(
    (catalog.powerSupplyBrands || []).map((brand) => [brandValue(brand), Number(catalog.powerSupplyPrice) || 0])
  );
  let powerSupplyPrice = Number(catalog.powerSupplyPrice) || 0;
  const preferredBaseRows = preferredBasePriceRows(rows);

  for (const row of rows) {
    const id = row.technical_metadata?.id || row.source_key?.split(":").pop();
    const price = Number(row.unit_price);
    if (!Number.isFinite(price)) continue;
    if (basePriceComponents.has(row.component_type) && basePriceTiers.has(row.price_tier)
      && preferredBaseRows.get(basePriceIdentity(row)) !== row) continue;

    if (row.component_type === "module") {
      const brand = row.brand_name;
      if (!id || !brand || !["default", "gold"].includes(row.price_tier)) continue;
      const technology = String(row.technical_metadata?.technology || "smd").toLowerCase();
      const location = String(row.technical_metadata?.location || "indoor").toLowerCase();
      catalog.modelGroups[technology] ||= {};
      catalog.modelGroups[technology][location] ||= [];
      let model = catalog.modelGroups[technology][location].find((item) => String(item.id) === String(id));
      if (!model) {
        model = { id, name: row.model || row.technical_metadata?.name || id, prices: {} };
        catalog.modelGroups[technology][location].push(model);
      }
      if (brand === "Lampro") model.prices = { default: price };
      catalog.moduleBrandPrices[brand] = {
        ...(catalog.moduleBrandPrices[brand] || {}),
        [id]: { default: price },
      };
      continue;
    }

    if (row.component_type === "controller" && (row.price_tier === "default" || row.price_tier === "gold")) {
      const controller = [...controllers, ...novastarControllers].find((item) => String(item.id) === String(id) || String(item.id) === String(row.model));
      if (controller) controller.price = price;
      continue;
    }

    if (row.component_type === "receiving-card") {
      const cardId = receivingCards[id] ? id : row.model;
      const card = receivingCards[cardId];
      if (card) receivingCards[cardId] = row.price_tier === "cob" ? { ...card, cobUnitPrice: price } : { ...card, unitPrice: price };
      continue;
    }

    if (row.component_type === "cabinet" && (row.price_tier === "default" || row.price_tier === "gold")) {
      const index = cabinetOptions.findIndex((item) => String(item.id) === String(id) || String(item.id) === String(row.model));
      if (index >= 0) cabinetOptions[index] = { ...cabinetOptions[index], price };
      continue;
    }

    if (row.component_type === "power-supply" && (row.price_tier === "default" || row.price_tier === "gold")) {
      if (row.brand_name) powerSupplyPrices[row.brand_name] = price;
      const firstBrand = brandValue((catalog.powerSupplyBrands || [])[0]);
      if (!row.brand_name || row.brand_name === firstBrand) powerSupplyPrice = price;
    }
  }

  const groupedBrands = new Map();
  for (const row of brandRows) {
    if (!groupedBrands.has(row.id)) groupedBrands.set(row.id, { value: row.name, label: row.name, modelIds: [] });
    const modelId = row.technical_metadata?.id || row.source_key?.split(":").pop();
    if (modelId) groupedBrands.get(row.id).modelIds.push(modelId);
  }
  if (!groupedBrands.size) {
    for (const row of rows.filter((item) => item.component_type === "module" && item.brand_name)) {
      if (!groupedBrands.has(row.brand_name)) groupedBrands.set(row.brand_name, { value: row.brand_name, label: row.brand_name, modelIds: [] });
      const modelId = row.technical_metadata?.id || row.source_key?.split(":").pop();
      if (modelId) groupedBrands.get(row.brand_name).modelIds.push(modelId);
    }
  }
  const databaseBrands = [...groupedBrands.values()];

  return {
    ...catalog,
    moduleBrands: databaseBrands.length ? databaseBrands.map(({ value, label }) => ({ value, label })) : catalog.moduleBrands,
    moduleBrandModelIds: databaseBrands.length ? Object.fromEntries(databaseBrands.map((brand) => [brand.value, [...new Set(brand.modelIds)]])) : catalog.moduleBrandModelIds,
    controllers,
    novastarControllers,
    receivingCards,
    cabinetOptions,
    powerSupplyPrice,
    powerSupplyPrices,
  };
}
