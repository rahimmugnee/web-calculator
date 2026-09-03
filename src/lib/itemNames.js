export function withoutLedTechnology(value = "") {
  return String(value)
    .replace(/\(\s*(?:SMD|COB|GOB)\s*\)/gi, " ")
    .replace(/\b(?:SMD|COB|GOB)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();
}

export function componentModelName(value = "", fallbackLabel = "", internalId = "") {
  const clean = (text) => String(text || "")
    .replace(/^(?:Controller|Receiving Card|Video Processor)\s*:\s*/i, "")
    .trim();
  const model = String(value || "").trim();
  const fallback = clean(fallbackLabel);
  const isInternalId = model && (
    /^NS_/i.test(model)
    || (internalId && model.toLowerCase() === String(internalId).trim().toLowerCase())
  );

  if (isInternalId) return fallback || model.replace(/^NS_/i, "");
  return clean(model) || fallback;
}

export function powerSupplyItemName(value = "", model = "") {
  const label = String(value || model || "")
    .replace(/^Power Supply\s*:\s*/i, "")
    .trim();
  return label ? `Power Supply: ${label}` : "Power Supply";
}
