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

export function generateRef() {
  const d = new Date();
  const y = String(d.getFullYear()).slice(-2);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const rnd = Math.floor(1000 + Math.random() * 9000);
  return `HO/MQ-${y}${m}${day}-${rnd}`;
}

/** Safe PDF filename stem from quotation Ref (matches invoice identity). */
export function sanitizeRefForFilename(refNo) {
  const s = String(refNo || "MQ").trim();
  const cleaned = s.replace(/[/\\:*?"<>|]/g, "-").replace(/\s+/g, "_");
  return cleaned || "MQ";
}

export function quotationPdfFilename(refNo) {
  return `${sanitizeRefForFilename(refNo)}.pdf`;
}

export function calcAll({
  modulesQty = 0,
  rcQty = 0,
  psQty = 0,
  controllerQty = 0,
  controllerPrice = 0,
  unitModule = 0,
  unitRC = 0,
  unitPS = 0,

  cabinetQty = 0,
  unitCabinet = 0,

  accessoriesMode = "auto",
  accessoriesValue = 0,

  installMode = "auto",
  installIsPercent = false,
  installValue = 0,

  sft = 0,
  dispType = "indoor",

  vatEnabled = false,
  taxMarkupRate = 0.05,
  vatRate = 0.1,

  discountEnabled = false,
  discountTk = 0,
}) {
  const area = parseFloat(sft) || 0;

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

  const priceFactor = vatEnabled ? 1 + taxMarkupRate : 1;

  const effUnitModule = ceilNonNeg(moduleUnitBase * priceFactor);
  const effUnitRC = ceilNonNeg(rcUnitBase * priceFactor);
  const effUnitPS = ceilNonNeg(psUnitBase * priceFactor);
  const effUnitCtrl = ceilNonNeg(ctrlUnitBase * priceFactor);
  const effUnitCabinet = ceilNonNeg(cabinetUnitBase * priceFactor);

  const totalModules = ceilNonNeg(modulesQtyInt * effUnitModule);
  const totalRC = ceilNonNeg(rcQtyInt * effUnitRC);
  const totalPS = ceilNonNeg(psQtyInt * effUnitPS);
  const controllerTotal = ceilNonNeg(controllerQtyInt * effUnitCtrl);
  const totalCabinet = ceilNonNeg(cabinetQtyInt * effUnitCabinet);

  const goodsSubTotal = totalModules + totalRC + totalPS + controllerTotal + totalCabinet;

  let accTk = 0;
  if (accessoriesMode === "manual") {
    accTk = ceilNonNeg(accessoriesValue);
  } else {
    if (area > 0 && area < 60) {
      accTk = 24000;
    } else if (area >= 60) {
      accTk = ceilNonNeg(area * 420);
    } else {
      accTk = 0;
    }

    if (dispType === "outdoor") {
      accTk = ceilNonNeg(accTk * 1.67);
    }
  }

  if (vatEnabled) accTk = ceilNonNeg(accTk * (1 + taxMarkupRate));

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

  const subTotal = ceilNonNeg(goodsSubTotal + accTk);
  const totalBeforeVat = ceilNonNeg(goodsSubTotal + accTk + installTk);
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
      accessories: accTk,
      installation: installTk,
      subTotal,
      totalBeforeVat,
      vatAmount,
      vatRate,
      vatEnabled,
      grandTotal,
      discountEnabled,
      discount: discountApplied,
      payable,
    },
    unitPrices: {
      unitModule: effUnitModule,
      unitRC: effUnitRC,
      unitPS: effUnitPS,
      unitCtrl: effUnitCtrl,
      unitCabinet: effUnitCabinet,
      accessories: accTk,
    },
  };
}
