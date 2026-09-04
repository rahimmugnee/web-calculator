// src/lib/calc.js

const bdtFormatter0 = new Intl.NumberFormat("en-BD", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

const ceilNum = (v) => Math.ceil(Number(v) || 0);
const ceilNonNeg = (v) => Math.max(0, ceilNum(v));

export function toBDT(n) {
  const num = ceilNonNeg(n);
  if (!isFinite(num)) return "৳0";
  return "৳" + bdtFormatter0.format(num);
}

/* ---------- Amount in words (BDT, crore/lakh) ---------- */
export function bdtToWords(amount) {
  const units = [
    "", "One", "Two", "Three", "Four", "Five", "Six",
    "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve",
    "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen",
    "Eighteen", "Nineteen",
  ];
  const tens = [
    "", "", "Twenty", "Thirty", "Forty", "Fifty",
    "Sixty", "Seventy", "Eighty", "Ninety",
  ];

  function two(n) {
    if (n < 20) return units[n];
    const t = Math.floor(n / 10);
    const u = n % 10;
    return tens[t] + (u ? " " + units[u] : "");
  }

  function three(n) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    return (h ? units[h] + " Hundred" + (r ? " " : "") : "") + (r ? two(r) : "");
  }

  amount = ceilNonNeg(amount);
  if (!amount) return "Zero Taka Only.";

  const crore = Math.floor(amount / 10000000);
  amount %= 10000000;
  const lakh = Math.floor(amount / 100000);
  amount %= 100000;
  const th = Math.floor(amount / 1000);
  amount %= 1000;
  const rest = amount;

  const parts = [];
  if (crore) parts.push(three(crore) + " Crore");
  if (lakh) parts.push(three(lakh) + " Lakh");
  if (th) parts.push(three(th) + " Thousand");
  if (rest) parts.push(three(rest));

  return parts.join(" ") + " Taka Only.";
}

export function quotationCompanyPrefix(companyCode = "mugnee") {
  const code = String(companyCode || "").toLowerCase();
  if (code.includes("renex")) return "REN";
  if (code.includes("sasha")) return "SAS";
  return "MUG";
}

export function generateRef(companyCode = "mugnee", requestedSequence, date = new Date(), requestedPrefix) {
  const configuredPrefix = String(requestedPrefix || "").trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  const prefix = configuredPrefix || quotationCompanyPrefix(companyCode);
  const year = date.getFullYear();
  let sequence = Number(requestedSequence);
  if (!Number.isInteger(sequence) || sequence < 1) {
    const storageKey = `quotationReferenceSequence:${prefix}:${year}`;
    try {
      sequence = Number(window.localStorage.getItem(storageKey) || 0) + 1;
      window.localStorage.setItem(storageKey, String(sequence));
    } catch {
      sequence = 1;
    }
  }
  return `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;
}

/** Safe PDF filename stem from quotation Ref (matches invoice identity). */
export function sanitizeRefForFilename(refNo) {
  const s = String(refNo || "MQ").trim();
  const cleaned = s
    .replace(/[/\\:*?"<>|]/g, "-")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_")
    .replace(/-+/g, "-")
    .replace(/^[._-]+|[._-]+$/g, "");
  return cleaned || "MQ";
}

export function quotationPdfFilename(refNo) {
  return `${sanitizeRefForFilename(refNo)}.pdf`;
}

export function buildQuotationTitle(snapshot = {}) {
  if (snapshot?.quotationType === "pa") {
    return snapshot.paInstallationType === "ip" ? "Proposal For IP PA System" : "Proposal For Wired PA System";
  }

  if (snapshot?.quotationType === "conference") {
    return snapshot.conferenceSystemType === "wireless"
      ? "Proposal For Wireless Conference System"
      : "Proposal For Wired Conference System";
  }

  if (snapshot?.quotationType === "rental") {
    const widthFt = String(snapshot?.display?.widthFt || "").trim();
    const heightFt = String(snapshot?.display?.heightFt || "").trim();
    const sizePart = widthFt || heightFt ? ` (${widthFt || "-"}ft x ${heightFt || "-"}ft)` : "";
    return `Rental LED Display Quotation${sizePart}`.replace(/\s+/g, " ").trim();
  }

  const modelName = String(snapshot?.model?.name || "LED Display").trim();
  const technology = String(snapshot?.items?.technology || "").trim().toUpperCase();
  const widthFt = String(snapshot?.display?.widthFt || "").trim();
  const heightFt = String(snapshot?.display?.heightFt || "").trim();
  const sft = String(snapshot?.display?.sft || "").trim();

  const techPart = technology ? ` (${technology})` : "";
  const sizePart = widthFt || heightFt ? ` (${widthFt || "-"}ft x ${heightFt || "-"}ft)` : "";
  const sftPart = sft ? ` Sft ${sft}` : "";

  return `Proposal for ${modelName}${techPart} LED Display.${sizePart}${sftPart}`
    .replace(/\s+/g, " ")
    .trim();
}

export function buildQuotationFilenameTitle(snapshot = {}) {
  if (snapshot?.quotationType === "pa") {
    return snapshot.paInstallationType === "ip" ? "Proposal For IP PA System" : "Proposal For Wired PA System";
  }

  if (snapshot?.quotationType === "conference") {
    return snapshot.conferenceSystemType === "wireless"
      ? "Proposal For Wireless Conference System"
      : "Proposal For Wired Conference System";
  }

  if (snapshot?.quotationType === "rental") {
    const widthFt = String(snapshot?.display?.widthFt || "").trim();
    const heightFt = String(snapshot?.display?.heightFt || "").trim();
    const sizePart = widthFt || heightFt ? ` (${widthFt || "-"}ft x ${heightFt || "-"}ft)` : "";
    return `Rental LED Display Quotation${sizePart}`.replace(/\s+/g, " ").trim();
  }

  const modelName = String(snapshot?.model?.name || "LED Display").trim();
  const technology = String(snapshot?.items?.technology || "").trim().toUpperCase();
  const widthFt = String(snapshot?.display?.widthFt || "").trim();
  const heightFt = String(snapshot?.display?.heightFt || "").trim();

  const techPart = technology ? ` (${technology})` : "";
  const sizePart = widthFt || heightFt ? ` (${widthFt || "-"}ft x ${heightFt || "-"}ft)` : "";

  return `Proposal for ${modelName}${techPart} LED Display.${sizePart}`
    .replace(/\s+/g, " ")
    .trim();
}

export function quotationTitlePdfFilename(snapshot) {
  const title = buildQuotationFilenameTitle(snapshot);
  const safeTitle = sanitizeRefForFilename(title);
  const titleStem = safeTitle.slice(0, 160).replace(/^[._-]+|[._-]+$/g, "") || "Mugnee_Quotation";
  return `${titleStem}.pdf`;
}

export function calcAll({
  quotationMode = "regular",
  irregularQty = 1,
  modulesQty = 0,
  rcQty = 0,
  psQty = 0,
  controllerQty = 0,
  controllerPrice = 0,
  unitModule = 0,
  unitRC = 0,
  unitPS = 0,

  customItemEnabled = false,
  customItemPrice = 0,
  customItems = [],

  cabinetQty = 0,
  unitCabinet = 0,

  accessoriesMode = "auto",
  accessoriesValue = 0,

  installMode = "auto",
  installIsPercent = false,
  installValue = 0,

  transportEnabled = false,
  transportValue = 0,

  sft = 0,
  dispType = "indoor",

  vatEnabled = false,
  taxMarkupRate = 0.05,
  vatRate = 0.1,

  discountEnabled = false,
  discountTk = 0,
}) {
  const area = parseFloat(sft) || 0;
  const isIrregular = quotationMode === "irregular";
  const irregularQtyInt = isIrregular ? Math.max(1, ceilNonNeg(irregularQty)) : 1;

  const modulesQtyInt = ceilNonNeg(modulesQty);
  const rcQtyInt = ceilNonNeg(rcQty);
  const psQtyInt = ceilNonNeg(psQty);
  const controllerQtyInt = ceilNonNeg(controllerQty);
  const cabinetQtyInt = ceilNonNeg(cabinetQty);

  const moduleUnitBase = ceilNonNeg(unitModule);
  const rcUnitBase = ceilNonNeg(unitRC);
  const psUnitBase = ceilNonNeg(unitPS);
  const ctrlUnitBase = ceilNonNeg(controllerPrice);
  const cabinetUnitBase = ceilNonNeg(unitCabinet);
  const customItemUnitBases = customItemEnabled && customItems.length
    ? customItems.map((item) => ceilNonNeg(item?.price))
    : customItemEnabled
    ? [ceilNonNeg(customItemPrice)]
    : [];

  const priceFactor = vatEnabled ? 1 + taxMarkupRate : 1;

  const effUnitModule = ceilNonNeg(moduleUnitBase * priceFactor);
  const effUnitRC = ceilNonNeg(rcUnitBase * priceFactor);
  const effUnitPS = ceilNonNeg(psUnitBase * priceFactor);
  const effUnitCtrl = ceilNonNeg(ctrlUnitBase * priceFactor);
  const effUnitCabinet = ceilNonNeg(cabinetUnitBase * priceFactor);
  const effUnitCustomItems = customItemUnitBases.map((price) => ceilNonNeg(price * priceFactor));
  const effUnitCustomItem = effUnitCustomItems.reduce((sum, price) => sum + price, 0);

  const totalModulesBase = ceilNonNeg(modulesQtyInt * effUnitModule);
  const totalRCBase = ceilNonNeg(rcQtyInt * effUnitRC);
  const totalPSBase = ceilNonNeg(psQtyInt * effUnitPS);
  const totalCabinetBase = ceilNonNeg(cabinetQtyInt * effUnitCabinet);
  const ledSetUnitTotal = ceilNonNeg(totalModulesBase + totalRCBase + totalPSBase + totalCabinetBase);

  const totalModules = ceilNonNeg(totalModulesBase * irregularQtyInt);
  const totalRC = ceilNonNeg(totalRCBase * irregularQtyInt);
  const totalPS = ceilNonNeg(totalPSBase * irregularQtyInt);
  const controllerTotal = ceilNonNeg(controllerQtyInt * effUnitCtrl);
  const totalCabinet = ceilNonNeg(totalCabinetBase * irregularQtyInt);
  const totalCustomItem = effUnitCustomItem;

  const goodsSubTotal = totalModules + totalRC + totalPS + controllerTotal + totalCabinet + totalCustomItem;

  let accTkBase = 0;
  if (accessoriesMode === "manual") {
    accTkBase = ceilNonNeg(accessoriesValue);
  } else {
    if (area > 0 && area < 60) {
      accTkBase = 24000;
    } else if (area >= 60) {
      accTkBase = ceilNonNeg(area * 420);
    } else {
      accTkBase = 0;
    }

    if (dispType === "outdoor") {
      accTkBase = ceilNonNeg(accTkBase * 1.67);
    }
  }

  if (vatEnabled) accTkBase = ceilNonNeg(accTkBase * (1 + taxMarkupRate));
  const accTk = ceilNonNeg(accTkBase * (isIrregular ? irregularQtyInt : 1));

  let installTk = 0;
  const subTotalForInstall = goodsSubTotal + accTk;

  if (installMode === "manual") {
    if (installIsPercent) {
      const pct = parseFloat(installValue) || 0;
      installTk = ceilNonNeg(subTotalForInstall * (pct / 100));
    } else {
      installTk = ceilNonNeg(installValue);
    }
  } else {
    if (area > 0 && area < 60) {
      installTk = 24000;
    } else if (area >= 60) {
      installTk = ceilNonNeg(area * 400);
    } else {
      installTk = 0;
    }
  }

  if (vatEnabled) installTk = ceilNonNeg(installTk * (1 + taxMarkupRate));
  if (isIrregular && !(installMode === "manual" && installIsPercent)) {
    installTk = ceilNonNeg(installTk * irregularQtyInt);
  }

  let transportTk = transportEnabled ? ceilNonNeg(transportValue) : 0;
  if (vatEnabled) transportTk = ceilNonNeg(transportTk * (1 + taxMarkupRate));

  const subTotal = ceilNonNeg(goodsSubTotal + accTk);
  const totalBeforeVat = ceilNonNeg(goodsSubTotal + accTk + installTk + transportTk);
  const vatAmount = vatEnabled ? ceilNonNeg(totalBeforeVat * vatRate) : 0;
  const grandTotal = ceilNonNeg(totalBeforeVat + vatAmount);

  const rawDiscount = discountEnabled ? ceilNonNeg(discountTk) : 0;
  const discountApplied = Math.min(rawDiscount, grandTotal);
  const payable = ceilNonNeg(grandTotal - discountApplied);

  return {
    sft,
    totals: {
      totalModules,
      totalRC,
      totalPS,
      controllerTotal,
      totalCabinet,
      totalCustomItem,
      accessories: accTk,
      installation: installTk,
      transport: transportTk,
      subTotal,
      totalBeforeVat,
      vatAmount,
      vatRate,
      vatEnabled,
      grandTotal,
      discountEnabled,
      discount: discountApplied,
      payable,
      ledSetUnitTotal,
      accessoriesUnit: accTkBase,
      installationUnit: isIrregular && irregularQtyInt > 0 ? ceilNonNeg(installTk / irregularQtyInt) : installTk,
      irregularQty: irregularQtyInt,
    },
    unitPrices: {
      unitModule: effUnitModule,
      unitRC: effUnitRC,
      unitPS: effUnitPS,
      unitCtrl: effUnitCtrl,
      unitCabinet: effUnitCabinet,
      customItem: effUnitCustomItem,
      customItems: effUnitCustomItems,
      accessories: isIrregular ? accTkBase : accTk,
      transport: transportTk,
    },
  };
}
