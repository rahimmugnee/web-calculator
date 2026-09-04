const KNOWN_CALCULATOR_TYPES = ["fixed-led", "rental-led", "pa-system", "conference-system"];

const isRecord = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);

const numberAtLeast = (value, minimum, fallback) => {
  if (value === "" || value === null || typeof value === "undefined") return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= minimum ? parsed : fallback;
};

const quantityAtLeastOne = (value, fallback = 1) =>
  Math.max(1, Math.ceil(numberAtLeast(value, 0, fallback)));

function normalizeRentalSettings(settings) {
  const source = isRecord(settings) ? settings : {};
  const includedQty = isRecord(source.includedQty) ? source.includedQty : {};

  return {
    ...source,
    sftRate: numberAtLeast(source.sftRate, 0, 150),
    structureRate: numberAtLeast(source.structureRate, 0, 3000),
    soundRate: numberAtLeast(source.soundRate, 0, 0),
    transportValue: numberAtLeast(source.transportValue, 0, 0),
    duration: quantityAtLeastOne(source.duration),
    vatEnabled: typeof source.vatEnabled === "boolean" ? source.vatEnabled : false,
    includedQty: {
      ...includedQty,
      mixer: quantityAtLeastOne(includedQty.mixer),
      processor: quantityAtLeastOne(includedQty.processor),
      wirelessMic: quantityAtLeastOne(includedQty.wirelessMic),
      wiredMic: quantityAtLeastOne(includedQty.wiredMic),
      laptop: quantityAtLeastOne(includedQty.laptop),
      technicalPerson: quantityAtLeastOne(includedQty.technicalPerson),
    },
  };
}

function calculatorMap(value) {
  if (Array.isArray(value)) {
    return Object.fromEntries(value
      .filter((row) => isRecord(row) && row.calculator_type && row.is_active !== false)
      .map((row) => [String(row.calculator_type), isRecord(row.settings) ? row.settings : {}]));
  }

  if (!isRecord(value)) return {};
  return Object.fromEntries(Object.entries(value).map(([type, entry]) => {
    if (isRecord(entry?.settings)) return [type, entry.settings];
    return [type, isRecord(entry) ? entry : {}];
  }));
}

/**
 * Gives the calculator a stable runtime-settings shape regardless of whether
 * the API returned repository-style maps or admin-style calculator rows.
 */
export function normalizeRuntimeSettings(payload) {
  const source = isRecord(payload) ? payload : {};
  const incomingCalculators = calculatorMap(source.calculators);
  const calculators = Object.fromEntries(KNOWN_CALCULATOR_TYPES.map((type) => [type, {}]));

  for (const [type, settings] of Object.entries(incomingCalculators)) {
    calculators[type] = { ...settings };
  }
  calculators["rental-led"] = normalizeRentalSettings(calculators["rental-led"]);

  return {
    ...source,
    calculators,
    quotation: isRecord(source.quotation) ? { ...source.quotation } : {},
    invoice: isRecord(source.invoice) ? { ...source.invoice } : {},
  };
}

