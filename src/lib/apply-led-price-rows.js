import { componentModelName } from "./itemNames.js";

const cloneCatalog = (catalog) => JSON.parse(JSON.stringify(catalog || {}));
const basePriceComponents = new Set(["module", "controller", "cabinet", "power-supply"]);
const basePriceTiers = new Set(["default", "gold"]);

const databaseProductFields = (row, fallback = {}, internalId = "") => {
  const rowModel = String(row.model || "").trim();
  const modelIsInternalId = rowModel && internalId
    && rowModel.toLowerCase() === String(internalId).trim().toLowerCase();
  return {
    itemName: row.name || fallback.itemName || "",
    brand: row.brand_name || fallback.brand || "",
    model: rowModel && !modelIsInternalId ? rowModel : fallback.model || "",
    unit: row.unit || fallback.unit || "Pcs",
  };
};

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

const modulePitch = (model) => {
  const match = String(model?.id || model?.name || "").match(/p\s*(\d+(?:[._]\d+)?)/i);
  return match ? Number(match[1].replace("_", ".")) : Number.POSITIVE_INFINITY;
};

const modulePitchName = (id, fallback) => {
  const match = String(id || "").match(/p(\d+(?:[._]\d+)?)/i);
  return match ? `P${match[1].replace("_", ".")}` : fallback;
};

const cabinetSortValue = (values, value) => values[String(value || "").toLowerCase()] ?? 99;

function sortAuthoritativeCatalog(catalog, cabinetOptions) {
  for (const locations of Object.values(catalog.modelGroups || {})) {
    for (const models of Object.values(locations || {})) {
      models.sort((left, right) =>
        modulePitch(left) - modulePitch(right)
        || String(left.id || "").localeCompare(String(right.id || ""))
      );
    }
  }

  const displayOrder = { indoor: 0, outdoor: 1 };
  const materialOrder = { mild_steel: 0, magnesium: 1, aluminium: 2 };
  const variantOrder = { open: 0, backdoor: 1 };
  const sizeOrder = { "640x480": 0, "640x640": 1, "960x960": 2, "1280x1280": 3 };
  cabinetOptions.sort((left, right) =>
    cabinetSortValue(displayOrder, left.displayType) - cabinetSortValue(displayOrder, right.displayType)
    || cabinetSortValue(materialOrder, left.materialCode) - cabinetSortValue(materialOrder, right.materialCode)
    || cabinetSortValue(variantOrder, left.variantCode) - cabinetSortValue(variantOrder, right.variantCode)
    || cabinetSortValue(sizeOrder, left.sizeKey) - cabinetSortValue(sizeOrder, right.sizeKey)
    || String(left.id || "").localeCompare(String(right.id || ""))
  );
}

export function applyLedPriceRows(baseCatalog, rows = [], brandRows = [], { authoritative = false } = {}) {
  const catalog = cloneCatalog(baseCatalog);
  if (authoritative) {
    catalog.modelGroups = {};
    catalog.moduleBrandPrices = {};
    catalog.moduleBrandLabels = {};
    catalog.moduleBrandModelNames = {};
    catalog.moduleBrandDetails = {};
  }
  catalog.modelGroups ||= {};
  catalog.moduleBrandPrices ||= {};
  catalog.moduleBrandLabels ||= {};
  catalog.moduleBrandModelNames ||= {};
  catalog.moduleBrandDetails ||= {};
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

  const controllers = authoritative ? [] : [...(catalog.controllers || [])];
  const novastarControllers = authoritative ? [] : [...(catalog.novastarControllers || [])];
  const receivingCards = authoritative ? {} : { ...(catalog.receivingCards || {}) };
  const cabinetOptions = authoritative ? [] : [...(catalog.cabinetOptions || [])];
  const powerSupplies = authoritative || rows.length ? [] : [...(catalog.powerSupplies || [])];
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
        model = { id, name: modulePitchName(id, row.technical_metadata?.name || row.model || id), prices: {} };
        catalog.modelGroups[technology][location].push(model);
      }
      if (brand === "Lampro") model.prices = { default: price };
      catalog.moduleBrandPrices[brand] = {
        ...(catalog.moduleBrandPrices[brand] || {}),
        [id]: { default: price },
      };
      if (row.model) {
        catalog.moduleBrandModelNames[brand] = {
          ...(catalog.moduleBrandModelNames[brand] || {}),
          [id]: row.model,
        };
      }
      if (row.name) {
        catalog.moduleBrandLabels[brand] = {
          ...(catalog.moduleBrandLabels[brand] || {}),
          [id]: row.name,
        };
      }
      catalog.moduleBrandDetails[brand] = {
        ...(catalog.moduleBrandDetails[brand] || {}),
        [id]: databaseProductFields(row, {
          itemName: catalog.moduleBrandLabels[brand]?.[id] || "LED Display Module",
          brand,
          model: catalog.moduleBrandModelNames[brand]?.[id] || model.name,
          unit: "Pcs",
        }),
      };
      continue;
    }

    if (row.component_type === "controller" && (row.price_tier === "default" || row.price_tier === "gold")) {
      let controller = [...controllers, ...novastarControllers].find((item) => String(item.id) === String(id) || String(item.id) === String(row.model));
      if (!controller && id) {
        controller = { ...(row.technical_metadata || {}), id };
        (String(id).startsWith("NS_") ? novastarControllers : controllers).push(controller);
      }
      if (controller) Object.assign(controller, databaseProductFields(row, {
        itemName: "Controller",
        model: componentModelName(controller.model, controller.label || row.name, controller.id),
        unit: "Pcs",
      }, controller.id), { price });
      continue;
    }

    if (row.component_type === "receiving-card") {
      const cardId = receivingCards[id] ? id : receivingCards[row.model] ? row.model : id || row.model;
      const card = receivingCards[cardId] || (id ? { ...(row.technical_metadata || {}), id } : null);
      if (card) {
        const fields = databaseProductFields(row, {
          itemName: "Receiving Card",
          model: componentModelName(card.model, card.label || row.name, cardId),
          unit: "Pcs",
        }, cardId);
        receivingCards[cardId || id] = row.price_tier === "cob"
          ? { ...card, ...fields, cobUnitPrice: price }
          : { ...card, ...fields, unitPrice: price };
      }
      continue;
    }

    if (row.component_type === "cabinet" && (row.price_tier === "default" || row.price_tier === "gold")) {
      let index = cabinetOptions.findIndex((item) => String(item.id) === String(id) || String(item.id) === String(row.model));
      if (index < 0 && id) {
        cabinetOptions.push({ ...(row.technical_metadata || {}), id });
        index = cabinetOptions.length - 1;
      }
      if (index >= 0) cabinetOptions[index] = {
        ...cabinetOptions[index],
        ...databaseProductFields(row, {
          itemName: "Cabinet",
          model: cabinetOptions[index].label || cabinetOptions[index].id,
          unit: "Pcs",
        }),
        sourceKey: row.source_key || cabinetOptions[index].sourceKey || "",
        sourceCatalog: row.source_catalog || cabinetOptions[index].sourceCatalog || "",
        catalogRole: row.source_catalog === "admin" ? "model" : "base",
        price,
      };
      continue;
    }

    if (row.component_type === "power-supply" && (row.price_tier === "default" || row.price_tier === "gold")) {
      const rowBrand = row.brand_name || row.technical_metadata?.brand || "";
      const index = powerSupplies.findIndex((supply) =>
        String(supply.id) === String(id)
        || (rowBrand && supply.brand === rowBrand && (!row.model || supply.model === row.model))
      );
      const current = index >= 0 ? powerSupplies[index] : {};
      const fields = databaseProductFields(row, {
        itemName: current.itemName || current.label || "Power Supply",
        brand: rowBrand || current.brand,
        model: current.model || row.technical_metadata?.model || "",
        unit: current.unit || "Pcs",
      }, current.id);
      const model = fields.model || current.model || "";
      const itemName = fields.itemName || current.itemName || current.label || (model ? `Power Supply: ${model}` : "Power Supply");
      const supply = {
        ...current,
        id: current.id || id,
        label: row.name || current.label || itemName,
        price,
        ...fields,
        itemName,
      };
      if (index >= 0) powerSupplies[index] = supply;
      else powerSupplies.push(supply);
      continue;
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
  if (authoritative) sortAuthoritativeCatalog(catalog, cabinetOptions);
  return {
    ...catalog,
    moduleBrands: databaseBrands.length || authoritative ? databaseBrands.map(({ value, label }) => ({ value, label })) : catalog.moduleBrands,
    moduleBrandModelIds: databaseBrands.length || authoritative ? Object.fromEntries(databaseBrands.map((brand) => [brand.value, [...new Set(brand.modelIds)]])) : catalog.moduleBrandModelIds,
    controllers,
    novastarControllers,
    receivingCards,
    cabinetOptions,
    powerSupplies,
  };
}
