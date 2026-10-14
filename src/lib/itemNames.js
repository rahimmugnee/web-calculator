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


export function cabinetItemName(value = "") {
  const name = String(value || "").trim();
  if (!name) return "Cabinet";
  if (/\bcabinet\b/i.test(name)) return name;
  const sizeIndex = name.search(/\d+(?:\.\d+)?\s*mm\s*[x\u00d7]/i);
  return sizeIndex >= 0
    ? `${name.slice(0, sizeIndex).trim()} Cabinet ${name.slice(sizeIndex)}`.trim()
    : `${name} Cabinet`;
}


export function displayModelName(value = "", displayType = "indoor") {
  const name = String(value || "").replace(/\b(?:indoor|outdoor)\b/gi, " ").replace(/\s+/g, " ").trim();
  return `${name} ${displayType === "outdoor" ? "Outdoor" : "Indoor"}`.trim();
}
