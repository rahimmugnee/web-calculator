export function buildCalculatorDataResponse({
  products = [],
  calculatorSettings = [],
  quotationSettings = null,
  invoiceSettings = null,
  priceTiers = [],
} = {}) {
  const settingsByCalculator = Object.fromEntries(
    calculatorSettings
      .filter((row) => row?.is_active !== false && row?.calculator_type)
      .map((row) => [String(row.calculator_type), row.settings || {}])
  );

  return {
    products: Array.isArray(products) ? products : [],
    calculatorSettings: settingsByCalculator,
    quotationSettings: quotationSettings || null,
    invoiceSettings: invoiceSettings || null,
    priceTiers: Array.isArray(priceTiers) ? priceTiers : [],
  };
}
