/** Pure helpers: last argument is always a slice from quotation catalog (or full catalog). */

export function parsePitch(modelName = "") {
  const m = (String(modelName).match(/P(\d+(?:[._]\d+)?)/i) || [])[1];
  return m ? m.replace("_", ".") : "";
}

export const roundInt = (x) => Math.max(1, Math.round(Number(x) || 0));

export function moduleFootprintFt(modelIdOrName, physical) {
  const raw = String(modelIdOrName || "");
  const id = raw.toLowerCase();
  const pitchStr = parsePitch(raw);
  const pitchNum = parseFloat(pitchStr || "0");
  const FT_320 = physical.ft320;
  const FT_160 = physical.ft160;
  const FT_192 = physical.ft192;
  const FT_250 = physical.ft250;

  const isP667 = pitchNum === 6.67 || id.includes("p6_67") || id.includes("6.67");
  const isP391 = pitchNum === 3.91 || id.includes("3.91") || id.includes("p3.91") || id.includes("p3_91");

  if (isP391) return { w: FT_250, h: FT_250 };

  const isP3 = pitchNum === 3 || (id.includes("p3") && !id.includes("3.9"));
  const isP6 = pitchNum === 6 && !isP667;

  if (isP3 || isP6) return { w: FT_192, h: FT_192 };

  return { w: FT_320, h: FT_160 };
}

export function getModuleRes(modelName = "", moduleRes) {
  const key = parsePitch(modelName);
  return moduleRes[key] || null;
}

export function pickReceivingCard(dispType, modelName = "", brand = "Huidu", technology = "smd", receivingCards = {}) {
  const pitch = parsePitch(modelName);
  const isCobSpecial = technology === "cob" && ["1.25", "1.53", "1.86"].includes(pitch);

  const pick = (id, overrides = {}) => {
    const cfg = receivingCards[id] || {};
    return {
      id,
      label: cfg.label || id,
      unitPrice: overrides.unitPrice ?? cfg.unitPrice ?? 0,
      pin: cfg.pin,
    };
  };

  if (isCobSpecial) {
    if (brand === "Novastar") return pick("NS_NV3210");
    const r732 = receivingCards.R732 || {};
    return pick("R732", { unitPrice: r732.cobUnitPrice ?? r732.unitPrice ?? 2900 });
  }

  const isIndoor = dispType === "indoor";
  const isP125 = pitch === "1.25";

  if (brand === "Novastar") {
    if (isIndoor && isP125) return pick("NS_NV3210");
    return pick("NS_NV7512");
  }

  if (isIndoor && isP125) return pick("R732");

  return pick("R712");
}

export function getRcCapacity(dispType, modelName = "", brand = "Huidu", rcCapacityHuidu, rcCapacityNovastar) {
  const p = parsePitch(modelName);
  const map = brand === "Novastar" ? rcCapacityNovastar : rcCapacityHuidu;
  if (map && map[dispType] && map[dispType][p]) return map[dispType][p];
  return 12;
}

export function getPsuCapacity(dispType, modelName = "", psuCapacity) {
  const p = parsePitch(modelName);
  return psuCapacity[dispType]?.[p] ?? 6;
}

function nearlyPitch(pitch, target) {
  return Math.abs(Number(pitch) - target) < 0.01;
}

function normalizeCabinetSizeKey(cabinet = {}) {
  const width = Number(cabinet.widthMm);
  const height = Number(cabinet.heightMm);
  if (width && height) return `${width}x${height}`;

  const raw = [cabinet.sizeKey, cabinet.id, cabinet.label]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/mm/g, "");

  if (raw.includes("640x480")) return "640x480";
  if (raw.includes("640x640")) return "640x640";
  if (raw.includes("960x960")) return "960x960";
  if (raw.includes("1240x960")) return "1240x960";
  if (raw.includes("1280x1280")) return "1280x1280";
  return "";
}

export function getCabinetRcPsuPerCabinet(modelName = "", cabinet = {}) {
  const pitch = Number(parsePitch(modelName));
  const sizeKey = normalizeCabinetSizeKey(cabinet);
  const isP125OrP153 = nearlyPitch(pitch, 1.25) || nearlyPitch(pitch, 1.53);

  if (sizeKey === "640x480") {
    return isP125OrP153 ? { rc: 2, psu: 2 } : { rc: 1, psu: 1 };
  }

  if (sizeKey === "640x640") {
    return isP125OrP153 ? { rc: 2, psu: 2 } : { rc: 1, psu: 2 };
  }

  if (sizeKey === "960x960") {
    const needsTwoRc = nearlyPitch(pitch, 2.5) || nearlyPitch(pitch, 3) || nearlyPitch(pitch, 3.076);
    return { rc: needsTwoRc ? 2 : 1, psu: 3 };
  }

  if (sizeKey === "1240x960" || sizeKey === "1280x1280") {
    const needsTwoRc = pitch >= 2.5 && pitch <= 4;
    return { rc: needsTwoRc ? 2 : 1, psu: 4 };
  }

  return { rc: 1, psu: 1 };
}

export function pickPSUModel(psuModelLabel) {
  return { model: psuModelLabel || "N200V5-A (5V40A)" };
}

export function gridAndPixels(modelName, widthFt, heightFt, moduleRes, physical) {
  const res = getModuleRes(modelName, moduleRes);
  if (!res) return { totalPixels: 0 };

  const fp = moduleFootprintFt(modelName, physical);
  const across = roundInt((parseFloat(widthFt) || 0) / fp.w);
  const down = roundInt((parseFloat(heightFt) || 0) / fp.h);

  const totalPxW = across * res.pxW;
  const totalPxH = down * res.pxH;
  return { totalPixels: totalPxW * totalPxH };
}

export function pickControllerByPixels(dispType, totalPixels, ctrlCap) {
  const list = ctrlCap[dispType] || [];
  if (!totalPixels || !list.length) return null;
  const fit = list.find((c) => totalPixels <= c.max);
  if (!fit) return null;
  return { id: fit.id, max: fit.max, qty: 1 };
}

export function getNovastarControllersForDisplayType(dispType, novastarControllers = [], novastarCtrlCap = {}) {
  const ids = new Set((novastarCtrlCap?.[dispType] || []).map((item) => item.id));
  return (novastarControllers || []).filter((controller) => ids.has(controller.id));
}

export function getNovastarControllerMax(id, dispType, novastarCtrlCap = {}) {
  const match = (novastarCtrlCap?.[dispType] || []).find((item) => item.id === id);
  return Number.isFinite(match?.max) ? match.max : undefined;
}

export function pickNovastarControllerByPixels(dispType, totalPixels, novastarCtrlCap = {}) {
  const list = (novastarCtrlCap?.[dispType] || []).filter((controller) => Number.isFinite(controller.max) && controller.max > 0);

  if (!totalPixels || !list.length) return null;

  const fit = list.find((controller) => totalPixels <= controller.max);
  if (!fit) return null;

  return { id: fit.id, max: fit.max, qty: 1 };
}

export function controllerPriceById(id, controllers) {
  const c = controllers.find((x) => x.id === id);
  return c ? c.price || 0 : 0;
}

export function novastarControllerPriceById(dispType, id, novastarControllers) {
  const c = (novastarControllers || []).find((x) => x.id === id);
  return c ? c.price || 0 : 0;
}
