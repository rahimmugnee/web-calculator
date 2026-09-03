// ===============================
// src/components/PriceForm.jsx
// ===============================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "../context/CatalogContext.jsx";
import RentalPriceForm from "./RentalPriceForm.jsx";
import PASystemForm from "./PASystemForm.jsx";
import ConferenceSystemForm from "./ConferenceSystemForm.jsx";
import { getCabinetFootprintFt } from "../data/component-model-and-price.js";
import { getTierPriceFromGold } from "../lib/tierPricing.js";
import {
  moduleFootprintFt,
  pickReceivingCard,
  getRcCapacity,
  getPsuCapacity,
  getCabinetRcPsuPerCabinet,
  getModuleRes,
  pickPSUModel,
  gridAndPixels,
  pickControllerByPixels,
  getNovastarControllersForDisplayType,
  getNovastarControllerMax,
  pickNovastarControllerByPixels,
  controllerPriceById,
  novastarControllerPriceById,
  roundInt,
} from "../lib/price-form-catalog-helpers.js";
import { calcAll } from "../lib/calc.js";

/* =========================
   âœ… ZERO-CLEAR INPUT HELPERS
   ========================= */
function zeroClearOnFocus(value, setter, disabled = false) {
  if (disabled) return;
  if (String(value) === "0") setter("");
}
function zeroRestoreOnBlur(value, setter, disabled = false) {
  if (disabled) return;
  if (value === "" || value === null || typeof value === "undefined") setter(0);
}

function componentModelName(value) {
  return String(value || "")
    .replace(/^(?:Controller|Receiving Card|Video Processor)\s*:\s*/i, "")
    .trim();
}

function buildStepSeries(step, max) {
  const values = [];
  for (let current = step; current <= max + 0.001; current += step) {
    values.push(Number(current.toFixed(2)));
  }
  return values;
}

const RATIO_HEIGHT_OPTIONS = buildStepSeries(0.525, 25.2);
const RATIO_WIDTH_OPTIONS = buildStepSeries(1.05, 45.15);
const MIN_AUTO_DISPLAY_SFT = 10;
const pixelFormatter = new Intl.NumberFormat("en-BD", { maximumFractionDigits: 0 });
const CUSTOM_MODULE_BRAND_VALUE = "Custom";
const CABINET_AREA_SIZE_ROWS = {
  "640x480": {
    widthRow: "cabinetWidth",
    heightRow: "cabinetHeight",
    widthOptions: buildStepSeries(2.1, 40),
    heightOptions: buildStepSeries(1.575, 25.2),
  },
  "640x640": {
    widthRow: "cabinetWidth",
    heightRow: "cabinetHeight640",
    widthOptions: buildStepSeries(2.1, 40),
    heightOptions: buildStepSeries(2.1, 25.2),
  },
  "960x960": {
    widthRow: "cabinetWidth960",
    heightRow: "cabinetHeight960",
    widthOptions: buildStepSeries(3.15, 41),
    heightOptions: buildStepSeries(3.15, 25.2),
  },
  "1280x1280": {
    widthRow: "cabinetWidth1280",
    heightRow: "cabinetHeight1280",
    widthOptions: buildStepSeries(4.2, 42),
    heightOptions: buildStepSeries(4.2, 25.2),
  },
};
const CABINET_SIZE_PICK_ROWS = {
  cabinetWidth: "640x480",
  cabinetHeight: "640x480",
  cabinetHeight640: "640x640",
  cabinetWidth960: "960x960",
  cabinetHeight960: "960x960",
  cabinetWidth1280: "1280x1280",
  cabinetHeight1280: "1280x1280",
};
const CABINET_WIDTH_PICK_ROWS = ["cabinetWidth", "cabinetWidth960", "cabinetWidth1280"];
const CABINET_HEIGHT_PICK_ROWS = ["cabinetHeight", "cabinetHeight640", "cabinetHeight960", "cabinetHeight1280"];
const CABINET_PICK_ROWS = [...CABINET_WIDTH_PICK_ROWS, ...CABINET_HEIGHT_PICK_ROWS];

function formatDisplayMeasure(value) {
  return (Math.round(value * 100) / 100).toFixed(2).replace(/\.?0+$/, "");
}

function getNearestSizeOption(options, target) {
  return options.reduce((closest, option) => {
    if (closest === null) return option;
    return Math.abs(option - target) < Math.abs(closest - target) ? option : closest;
  }, null);
}

function getAutoHeightFromWidth(widthFt, heightOptions = RATIO_HEIGHT_OPTIONS) {
  const width = parseFloat(widthFt);
  if (isNaN(width) || width <= 0) return "";

  const exactHeight = (width * 9) / 16;
  const nearestHeight = getNearestSizeOption(heightOptions, exactHeight);

  return nearestHeight ? formatDisplayMeasure(nearestHeight) : formatDisplayMeasure(exactHeight);
}

function getDimensionsFromWidth(widthFt, widthOptions = RATIO_WIDTH_OPTIONS, heightOptions = RATIO_HEIGHT_OPTIONS) {
  const width = parseFloat(widthFt);
  if (isNaN(width) || width <= 0) return { widthFt: "", heightFt: "", widthValue: null, heightValue: null };

  const nearestWidth = getNearestSizeOption(widthOptions, width);
  if (!nearestWidth) return { widthFt: "", heightFt: "", widthValue: null, heightValue: null };

  const heightFt = getAutoHeightFromWidth(nearestWidth, heightOptions);
  const heightValue = parseFloat(heightFt);

  return {
    widthFt: formatDisplayMeasure(nearestWidth),
    heightFt,
    widthValue: nearestWidth,
    heightValue: Number.isNaN(heightValue) ? null : heightValue,
  };
}

function getDimensionsFromArea(areaSft, widthOptions = RATIO_WIDTH_OPTIONS, heightOptions = RATIO_HEIGHT_OPTIONS) {
  const area = parseFloat(areaSft);
  if (isNaN(area) || area < MIN_AUTO_DISPLAY_SFT) {
    return { widthFt: "", heightFt: "" };
  }

  const bestMatch = widthOptions.reduce((closest, widthOption) => {
    const heightOption = parseFloat(getAutoHeightFromWidth(widthOption, heightOptions));
    const matchedArea = widthOption * heightOption;
    if (matchedArea < MIN_AUTO_DISPLAY_SFT) return closest;
    const diff = Math.abs(matchedArea - area);

    if (!closest || diff < closest.diff) {
      return { widthOption, heightOption, diff };
    }

    return closest;
  }, null);

  return bestMatch
    ? {
        widthFt: formatDisplayMeasure(bestMatch.widthOption),
        heightFt: formatDisplayMeasure(bestMatch.heightOption),
      }
    : { widthFt: "", heightFt: "" };
}

function clearSizeSelectionRows(selection, rows) {
  rows.forEach((row) => {
    delete selection[row];
  });
}

function uniqueCabinetOptions(options, valueKey, labelKey) {
  const seen = new Set();
  return options.reduce((items, option) => {
    const value = option?.[valueKey];
    if (!value || seen.has(value)) return items;
    seen.add(value);
    items.push({ value, label: option?.[labelKey] || value });
    return items;
  }, []);
}

function buildLegacyCabinetOptions(catalog) {
  const sizes = catalog.cabinetSizes?.length
    ? catalog.cabinetSizes
    : [{ id: "cabinet_640x480", label: "640mm x 480mm", widthMm: 640, heightMm: 480, modulesPerCabinet: 6 }];

  return sizes.map((size) => ({
    ...size,
    id: size.id?.startsWith("cabinet_indoor_") ? size.id : `cabinet_indoor_aluminium_${size.widthMm}x${size.heightMm}`,
    displayType: "indoor",
    materialCode: "aluminium",
    materialLabel: "Aluminium",
    variantCode: "",
    variantLabel: "",
    sizeKey: size.sizeKey || `${size.widthMm}x${size.heightMm}`,
    price: Number(size.price ?? catalog.cabinetCasePrice ?? 8000),
  }));
}

function buildCabinetInvoiceLabel(cabinet) {
  const material = cabinet?.materialLabel || "Aluminium";
  const variant = cabinet?.variantLabel ? `${cabinet.variantLabel} ` : "";
  return `${material} ${variant}Cabinet`.replace(/\s+/g, " ").trim();
}

function CustomSelect({ value, options, onChange, ariaLabel }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const selected = options.find((option) => option.value === value) || options[0];
  const disabled = !options.length;

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  return (
    <div
      className={`custom-select${open ? " open" : ""}${disabled ? " disabled" : ""}`}
      ref={wrapRef}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
      >
        <span>{selected?.label || ""}</span>
      </button>

      {open ? (
        <div className="custom-select-menu" role="listbox" aria-label={ariaLabel}>
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              className="custom-select-option"
              role="option"
              aria-selected={option.value === value}
              onClick={() => {
                onChange(option.value);
                setOpen(false);
              }}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function buildTotalsForCalc({
  snapshot,
  autoModulesQty,
  moduleUnitPrice,
  rcUnitPrice,
  psUnitPrice, // âœ… NEW
  cabinetQty,
  cabinetUnitPrice,
}) {
  const { items, install, display, accessories } = snapshot;
  return calcAll({
    quotationMode: snapshot.quotationMode,
    irregularQty: snapshot.irregular?.qty,
    modulesQty: autoModulesQty,

    // âœ… With Cabinet à¦¹à¦²à§‡ rc/ps cabinetQty à¦…à¦¨à§à¦¯à¦¾à§Ÿà§€ à¦¯à¦¾à¦¬à§‡ (snapshot à¦ already set)
    rcQty: items.rcQty ?? 0,
    psQty: items.psQty ?? 0,

    controllerQty: items.controllerQty ?? 0,
    controllerPrice: items.controllerPrice ?? 0,

    unitModule: moduleUnitPrice,
    unitRC: rcUnitPrice,

    // âœ… PSU unit price (manual override capable)
    unitPS: psUnitPrice,

    customItemEnabled: items?.customItem?.enabled ?? false,
    customItemPrice: items?.customItem?.price ?? 0,
    customItems: items?.customItems ?? [],

    // âœ… Cabinet (only when enabled) â€” NOW uses manual override price
    cabinetQty: items?.cabinetEnabled ? (cabinetQty || 0) : 0,
    unitCabinet: items?.cabinetEnabled ? (cabinetUnitPrice || 0) : 0,

    accessoriesMode: accessories.accessoriesMode,
    accessoriesValue: accessories.accessoriesValue,

    installMode: install.installMode,
    installIsPercent: install.installIsPercent,
    installValue: install.installValue,

    transportEnabled: snapshot.transport?.enabled ?? false,
    transportValue: snapshot.transport?.value ?? 0,

    sft: display?.sft,
    dispType: snapshot.items?.dispType || "indoor",

    vatEnabled: snapshot.vatEnabled,

    discountEnabled: snapshot.discountEnabled,
    discountTk: snapshot.discountTk ?? 0,
  });
}

export default function PriceForm({
  installationType = "fixed",
  displayType = "indoor",
  technology = "smd",
  onChange,
  onCalculated,
  sizePick,
  onSizeSelectionChange,
  rentalSizePick,
  onRentalSizeSelectionChange,
}) {
  const { catalog } = useCatalog();
  const loading = false;
  const error = null;
  const reload = () => {};
  const dispType = displayType;
  const [cabinetMaterial, setCabinetMaterial] = useState("aluminium");
  const [cabinetVariant, setCabinetVariant] = useState("");
  const [cabinetSizeId, setCabinetSizeId] = useState("cabinet_indoor_aluminium_640x480");

  const cabinetAllOptions = useMemo(() => {
    const options = catalog.cabinetOptions?.length ? catalog.cabinetOptions : buildLegacyCabinetOptions(catalog);
    return options.map((option) => ({
      ...option,
      price: Number(option.price ?? catalog.cabinetCasePrice ?? 8000),
    }));
  }, [catalog]);

  const cabinetMaterialOptions = useMemo(
    () => uniqueCabinetOptions(cabinetAllOptions.filter((option) => option.displayType === dispType), "materialCode", "materialLabel"),
    [cabinetAllOptions, dispType]
  );
  const activeCabinetMaterial =
    cabinetMaterialOptions.find((option) => option.value === cabinetMaterial)?.value ||
    cabinetMaterialOptions[0]?.value ||
    "aluminium";

  useEffect(() => {
    if (cabinetMaterial !== activeCabinetMaterial) setCabinetMaterial(activeCabinetMaterial);
  }, [activeCabinetMaterial, cabinetMaterial]);

  const cabinetVariantOptions = useMemo(
    () =>
      uniqueCabinetOptions(
        cabinetAllOptions.filter(
          (option) => option.displayType === dispType && option.materialCode === activeCabinetMaterial && option.variantCode
        ),
        "variantCode",
        "variantLabel"
      ),
    [activeCabinetMaterial, cabinetAllOptions, dispType]
  );
  const activeCabinetVariant =
    cabinetVariantOptions.find((option) => option.value === cabinetVariant)?.value ||
    cabinetVariantOptions[0]?.value ||
    "";

  useEffect(() => {
    if (!cabinetVariantOptions.length) {
      if (cabinetVariant) setCabinetVariant("");
      return;
    }
    if (cabinetVariant !== activeCabinetVariant) setCabinetVariant(activeCabinetVariant);
  }, [activeCabinetVariant, cabinetVariant, cabinetVariantOptions.length]);

  const cabinetSizeOptions = useMemo(() => {
    const filtered = cabinetAllOptions.filter(
      (option) =>
        option.displayType === dispType &&
        option.materialCode === activeCabinetMaterial &&
        (!cabinetVariantOptions.length || option.variantCode === activeCabinetVariant)
    );

    return filtered.length ? filtered : cabinetAllOptions.filter((option) => option.displayType === dispType);
  }, [activeCabinetMaterial, activeCabinetVariant, cabinetAllOptions, cabinetVariantOptions.length, dispType]);
  const selectedCabinetSize = useMemo(
    () => cabinetSizeOptions.find((size) => size.id === cabinetSizeId) ?? cabinetSizeOptions[0],
    [cabinetSizeId, cabinetSizeOptions]
  );

  useEffect(() => {
    if (!cabinetSizeOptions.length) return;
    if (!cabinetSizeOptions.some((size) => size.id === cabinetSizeId)) {
      setCabinetSizeId(cabinetSizeOptions[0].id);
    }
  }, [cabinetSizeId, cabinetSizeOptions]);

  const cabinetSizeLabel = selectedCabinetSize?.label || "640mm x 480mm";
  const cabinetModulesPerCabinet = selectedCabinetSize?.modulesPerCabinet || catalog.modulesPerCabinet || 6;
  const { w: CAB_W_FT, h: CAB_H_FT } = useMemo(
    () => getCabinetFootprintFt(catalog.physical, selectedCabinetSize?.id || cabinetSizeId, cabinetAllOptions),
    [cabinetAllOptions, cabinetSizeId, catalog.physical, selectedCabinetSize?.id]
  );

  // âœ… Cabinet mode (default: without cabinet)
  const [cabinetEnabled, setCabinetEnabled] = useState(false);
  const [quotationMode, setQuotationMode] = useState("regular");
  const [irregularQty, setIrregularQty] = useState(1);

  // âœ… VAT (default OFF)
  const [vatEnabled, setVatEnabled] = useState(false);

  // âœ… Discount (default OFF)
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountTk, setDiscountTk] = useState(0);

  // âœ… Technology (default SMD)
  const [moduleBrand, setModuleBrand] = useState("Lampro");
  const [customModuleBrandName, setCustomModuleBrandName] = useState("");

  // âœ… Payment Term (default 100%)
  const [paymentTermId, setPaymentTermId] = useState("PT_100");
  const [deliveryDays, setDeliveryDays] = useState(45);

  // âœ… Outdoor à¦¹à¦²à§‡ force SMD

  // âœ… Technology list: Outdoor => only SMD

  // âœ… models list depends on technology + display type
  const modelsForType = useMemo(() => {
    const techBlock = catalog.modelGroups[technology] || catalog.modelGroups.smd;
    const models=techBlock?.[dispType] || [],allowed=catalog.moduleBrandModelIds?.[moduleBrand];
    const availableModels=Array.isArray(allowed)?models.filter((item)=>allowed.includes(item.id)):models;
    const brandModelNames=catalog.moduleBrandModelNames?.[moduleBrand] || {};
    return availableModels.map((item) => ({
      ...item,
      pitchName: item.name,
      name: item.name,
      code: brandModelNames[item.id] || item.code || item.name,
    }));
  }, [technology, dispType, moduleBrand, catalog.modelGroups, catalog.moduleBrandModelIds, catalog.moduleBrandModelNames]);

  const [modelId, setModelId] = useState(modelsForType[0]?.id || "");
  const modelSelectionManualRef = useRef(false);

  const model = useMemo(() => {
    if (!modelsForType.length) return { id: "", name: "P1.25", prices: { default: 0 } };
    return modelsForType.find((m) => m.id === modelId) ?? modelsForType[0];
  }, [modelId, modelsForType]);

  const [ctrlSystemBrand, setCtrlSystemBrand] = useState("Novastar"); // Huidu | Novastar

  const [controllerId, setControllerId] = useState(catalog.controllers[0]?.id || "");
  const controllerSelectionManualRef = useRef(false);
  const [controllerQty, setControllerQty] = useState(1);

  const [customer, setCustomer] = useState({ name: "", company: "", address: "", mobile: "", position: "" });

  // âœ… IMPORTANT: sft will be auto ONLY
  const [display, setDisplay] = useState({ widthFt: "", heightFt: "", sft: "" });

  const [rcQty, setRcQty] = useState(10);
  const [receivingCardId, setReceivingCardId] = useState("");
  const receivingCardSelectionManualRef = useRef(false);
  const [psQty, setPsQty] = useState(17);
  const [psuBrand, setPsuBrand] = useState("Lampro");

  const [accessoriesMode, setAccessoriesMode] = useState("auto");
  const [accessoriesValue, setAccessoriesValue] = useState(0);
  const [customItemEnabled, setCustomItemEnabled] = useState(false);
  const [customItems, setCustomItems] = useState([{ id: 1, name: "", price: 0 }]);
  const nextCustomItemId = useRef(2);

  const [installMode, setInstallMode] = useState("auto");

  // âœ… IMPORTANT: Installation percent option removed; always Tk
  const installIsPercent = false;
  const [installValue, setInstallValue] = useState(0);

  const [transportEnabled, setTransportEnabled] = useState(false);
  const [transportValue, setTransportValue] = useState(0);

  const [tierId, setTierId] = useState("gold");
  const hasCalculatedRef = useRef(false);
  const [customWarranty, setCustomWarranty] = useState("");

  // âœ… Module Unit Price override
  const [modulePriceOverrideStr, setModulePriceOverrideStr] = useState("");
  const [modulePriceOverrideEnabled, setModulePriceOverrideEnabled] = useState(false);

  // âœ… Receiving Card Unit Price override
  const [rcPriceOverrideStr, setRcPriceOverrideStr] = useState("");
  const [rcPriceOverrideEnabled, setRcPriceOverrideEnabled] = useState(false);

  // âœ… Power Supply Unit Price override (âœ… NEW)
  const [psPriceOverrideStr, setPsPriceOverrideStr] = useState("");
  const [psPriceOverrideEnabled, setPsPriceOverrideEnabled] = useState(false);

  // âœ… Controller Price override
  const [controllerPriceOverrideStr, setControllerPriceOverrideStr] = useState("");
  const [controllerPriceOverrideEnabled, setControllerPriceOverrideEnabled] = useState(false);

  // âœ… Cabinet Unit Price override (NEW)
  const [cabinetPriceOverrideStr, setCabinetPriceOverrideStr] = useState("");
  const [cabinetPriceOverrideEnabled, setCabinetPriceOverrideEnabled] = useState(false);
  const [cabinetQtyOverrideStr, setCabinetQtyOverrideStr] = useState("");
  const [cabinetQtyOverrideEnabled, setCabinetQtyOverrideEnabled] = useState(false);

  const updateSizeSelection = useCallback(
    (updater) => {
      if (!onSizeSelectionChange) return;
      onSizeSelectionChange(updater);
    },
    [onSizeSelectionChange]
  );

  // Keep a valid manual model selection when fresh catalog data arrives.
  useEffect(() => {
    const first = modelsForType[0];
    setModelId((current) => {
      if (modelSelectionManualRef.current && modelsForType.some((item) => item.id === current)) return current;
      modelSelectionManualRef.current = false;
      return first?.id || "";
    });
  }, [modelsForType]);

  // âœ… area auto from width/height, but area input can also back-calculate 16:9 size
  useEffect(() => {
    const w = parseFloat(display.widthFt);
    const h = parseFloat(display.heightFt);

    if (!isNaN(w) && !isNaN(h) && w > 0 && h > 0) {
      const area = (w * h).toFixed(2);
      setDisplay((d) => (d.sft === area ? d : { ...d, sft: area }));
    } else {
      setDisplay((d) => (d.sft === "" ? d : { ...d, sft: "" }));
    }
  }, [display.widthFt, display.heightFt]);

  // âœ… Cabinet qty from Width/Height
  const autoCabinetQty = useMemo(() => {
    if (!cabinetEnabled) return 0;
    const w = parseFloat(display.widthFt);
    const h = parseFloat(display.heightFt);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return 0;

    const across = roundInt(w / CAB_W_FT);
    const down = roundInt(h / CAB_H_FT);
    return across * down;
  }, [cabinetEnabled, display.widthFt, display.heightFt, CAB_W_FT, CAB_H_FT]);

  useEffect(() => {
    setCabinetQtyOverrideEnabled(false);
    setCabinetQtyOverrideStr(String(autoCabinetQty || 0));
  }, [autoCabinetQty, cabinetEnabled, cabinetSizeId]);

  const cabinetQty = useMemo(() => {
    if (!cabinetQtyOverrideEnabled) return autoCabinetQty;
    const value = parseFloat(cabinetQtyOverrideStr);
    return Number.isFinite(value) && value >= 0 ? value : autoCabinetQty;
  }, [autoCabinetQty, cabinetQtyOverrideEnabled, cabinetQtyOverrideStr]);

  const autoModulesQty = useMemo(() => {
    const w = parseFloat(display.widthFt);
    const h = parseFloat(display.heightFt);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return 0;

    // âœ… With cabinet: modules = cabinetQty * 6
    if (cabinetEnabled) return (cabinetQty || 0) * cabinetModulesPerCabinet;

    // âœ… Without cabinet: existing logic
    const fp = moduleFootprintFt(model.id || model.name, catalog.physical);
    const across = roundInt(w / fp.w);
    const down = roundInt(h / fp.h);
    return across * down;
  }, [display.widthFt, display.heightFt, model, cabinetEnabled, cabinetQty, cabinetModulesPerCabinet, catalog.physical]);

  // âœ… AUTO module price by tier
  const moduleUnitPriceAuto = useMemo(() => {
    const p = catalog.moduleBrandPrices?.[moduleBrand]?.[model?.id] || model?.prices || {};
    return getTierPriceFromGold(p.default ?? p.gold, tierId);
  }, [catalog.moduleBrandPrices, model, tierId, moduleBrand]);

  // âœ… reset module override on model/tier/tech/type change
  useEffect(() => {
    setModulePriceOverrideEnabled(false);
    setModulePriceOverrideStr(moduleUnitPriceAuto ? String(Math.round(moduleUnitPriceAuto)) : "");
  }, [modelId, tierId, technology, dispType, moduleBrand, moduleUnitPriceAuto]);

  // âœ… final module price
  const moduleUnitPrice = useMemo(() => {
    if (!modulePriceOverrideEnabled) return moduleUnitPriceAuto;
    const v = parseFloat(modulePriceOverrideStr);
    if (isNaN(v) || v <= 0) return moduleUnitPriceAuto;
    return v;
  }, [modulePriceOverrideEnabled, modulePriceOverrideStr, moduleUnitPriceAuto]);

  // âœ… Cabinet Unit Price (auto + manual) â€” NEW
  const cabinetUnitPriceAuto = useMemo(
    () => Number(selectedCabinetSize?.price ?? catalog.cabinetCasePrice ?? 0),
    [catalog.cabinetCasePrice, selectedCabinetSize?.price]
  );
  useEffect(() => {
    // When cabinet toggles ON, reset to default auto
    if (cabinetEnabled) {
      setCabinetPriceOverrideEnabled(false);
      setCabinetPriceOverrideStr(String(Math.round(cabinetUnitPriceAuto || 0)));
    }
  }, [cabinetEnabled, cabinetUnitPriceAuto]);

  const cabinetUnitPrice = useMemo(() => {
    if (!cabinetEnabled) return 0;
    if (!cabinetPriceOverrideEnabled) return cabinetUnitPriceAuto;
    const v = parseFloat(cabinetPriceOverrideStr);
    if (isNaN(v) || v <= 0) return cabinetUnitPriceAuto;
    return v;
  }, [cabinetEnabled, cabinetPriceOverrideEnabled, cabinetPriceOverrideStr, cabinetUnitPriceAuto]);

  const { totalPixels } = useMemo(() => {
    return gridAndPixels(model.id || model.name, display.widthFt, display.heightFt, catalog.moduleRes, catalog.physical);
  }, [model.id, model.name, display.widthFt, display.heightFt, catalog.moduleRes, catalog.physical]);

  const totalModulePixels = useMemo(() => {
    const res = getModuleRes(model.id || model.name, catalog.moduleRes);
    if (!res || !autoModulesQty) return 0;
    return autoModulesQty * res.pxW * res.pxH;
  }, [model.id, model.name, autoModulesQty, catalog.moduleRes]);

  const irregularMultiplier = quotationMode === "irregular" ? Math.max(1, Math.ceil(parseFloat(irregularQty || 1) || 1)) : 1;
  const displayTotalModulePixels = totalModulePixels * irregularMultiplier;
  const controllerSelectionPixels = quotationMode === "irregular" ? displayTotalModulePixels : totalPixels;

  useEffect(() => {
    const autoLocal =
      ctrlSystemBrand === "Novastar"
        ? pickNovastarControllerByPixels(dispType, controllerSelectionPixels, catalog.novastarCtrlCap)
        : pickControllerByPixels(dispType, controllerSelectionPixels, catalog.ctrlCap);

    const validManualSelection = controllerSelectionManualRef.current && (
      controllerId === "" || (
        ctrlSystemBrand === "Novastar"
          ? getNovastarControllersForDisplayType(dispType, catalog.novastarControllers, catalog.novastarCtrlCap)
              .some((item) => item.id === controllerId)
          : catalog.controllers.some((item) => item.kind !== "receiving" && item.id === controllerId)
      )
    );
    if (validManualSelection) return;

    if (!autoLocal) {
      controllerSelectionManualRef.current = false;
      setControllerId("");
      setControllerQty(0);
      return;
    }
    controllerSelectionManualRef.current = false;
    setControllerId(autoLocal.id);
    setControllerQty(1);
  }, [ctrlSystemBrand, dispType, controllerSelectionPixels, controllerId, catalog.novastarControllers, catalog.novastarCtrlCap, catalog.controllers, catalog.ctrlCap]);

  const autoRcPicked = useMemo(
    () => pickReceivingCard(dispType, model?.id || model?.name || "", ctrlSystemBrand, technology, catalog.receivingCards),
    [dispType, model?.id, model?.name, ctrlSystemBrand, technology, catalog.receivingCards]
  );

  const receivingCardOptions = useMemo(() => {
    const ids =
      ctrlSystemBrand === "Novastar"
        ? ["NS_NV3210", "NS_NV7512", "NS_A5S_26", "NS_A5S_16"]
        : ["R732", "R712"];

    return ids
      .map((id) => {
        const card = catalog.receivingCards?.[id];
        if (!card) return null;
        const pinLabel = card.pin ? ` (${card.pin} pin)` : "";
        return {
          value: id,
          label: `${componentModelName(card.label || id)}${pinLabel}`,
        };
      })
      .filter(Boolean);
  }, [ctrlSystemBrand, catalog.receivingCards]);

  useEffect(() => {
    setReceivingCardId((current) => {
      if (receivingCardSelectionManualRef.current && receivingCardOptions.some((option) => option.value === current)) return current;
      receivingCardSelectionManualRef.current = false;
      return autoRcPicked?.id || receivingCardOptions[0]?.value || "";
    });
  }, [autoRcPicked?.id, receivingCardOptions]);

  const rcPicked = useMemo(() => {
    const selectedId = receivingCardId || autoRcPicked?.id;
    const selected = catalog.receivingCards?.[selectedId];
    if (!selected) return autoRcPicked;
    return {
      id: selectedId,
      label: selected.label || selectedId,
      unitPrice: selected.unitPrice ?? 0,
      pin: selected.pin,
    };
  }, [autoRcPicked, catalog.receivingCards, receivingCardId]);

  // âœ… RC auto unit price + reset override when picked changes
  const rcUnitPriceAuto = useMemo(() => rcPicked?.unitPrice ?? 0, [rcPicked]);

  useEffect(() => {
    setRcPriceOverrideEnabled(false);
    setRcPriceOverrideStr(rcUnitPriceAuto ? String(Math.round(rcUnitPriceAuto)) : "");
  }, [rcPicked?.id, dispType, modelId, ctrlSystemBrand, rcUnitPriceAuto]);

  const rcUnitPrice = useMemo(() => {
    if (!rcPriceOverrideEnabled) return rcUnitPriceAuto;
    const v = parseFloat(rcPriceOverrideStr);
    if (isNaN(v) || v <= 0) return rcUnitPriceAuto;
    return v;
  }, [rcPriceOverrideEnabled, rcPriceOverrideStr, rcUnitPriceAuto]);

  const cabinetRcPsuPerCabinet = useMemo(
    () => getCabinetRcPsuPerCabinet(model?.id || model?.name || "", selectedCabinetSize),
    [model?.id, model?.name, selectedCabinetSize]
  );

  const autoRcQty = useMemo(() => {
    // With cabinet, RC qty follows the selected cabinet size and pixel pitch.
    if (cabinetEnabled) return (cabinetQty || 0) * cabinetRcPsuPerCabinet.rc;

    const cap = getRcCapacity(dispType, model.id || model.name, ctrlSystemBrand, catalog.rcCapacityHuidu, catalog.rcCapacityNovastar);
    return cap > 0 ? Math.ceil((autoModulesQty || 0) / cap) : 0;
  }, [
    dispType,
    model.id,
    model.name,
    autoModulesQty,
    ctrlSystemBrand,
    cabinetEnabled,
    cabinetQty,
    cabinetRcPsuPerCabinet.rc,
    catalog.rcCapacityHuidu,
    catalog.rcCapacityNovastar,
  ]);

  const autoPsQty = useMemo(() => {
    // With cabinet, PSU qty follows the selected cabinet size and pixel pitch.
    if (cabinetEnabled) return (cabinetQty || 0) * cabinetRcPsuPerCabinet.psu;

    const cap = getPsuCapacity(dispType, model.id || model.name, catalog.psuCapacity);
    return cap > 0 ? Math.ceil((autoModulesQty || 0) / cap) : 0;
  }, [dispType, model.id, model.name, autoModulesQty, cabinetEnabled, cabinetQty, cabinetRcPsuPerCabinet.psu, catalog.psuCapacity]);

  useEffect(() => setRcQty(autoRcQty), [autoRcQty, dispType, modelId, display.widthFt, display.heightFt, cabinetEnabled]);
  useEffect(() => setPsQty(autoPsQty), [autoPsQty, dispType, modelId, display.widthFt, display.heightFt, cabinetEnabled]);

  const psuBrandOptions = useMemo(
    () =>
      (catalog.powerSupplyBrands?.length ? catalog.powerSupplyBrands : ["Lampro", "G-Energy", "Mean well"]).map((brand) =>
        typeof brand === "string" ? { value: brand, label: brand } : { value: brand.value, label: brand.label || brand.value }
      ),
    [catalog.powerSupplyBrands]
  );

  useEffect(() => {
    if (psuBrandOptions.length && !psuBrandOptions.some((option) => option.value === psuBrand)) {
      setPsuBrand(psuBrandOptions[0].value);
    }
  }, [psuBrand, psuBrandOptions]);

  const moduleBrandOptions = useMemo(
    () =>
      (catalog.moduleBrands || []).map((brand) =>
        typeof brand === "string" ? { value: brand, label: brand } : { value: brand.value, label: brand.label || brand.value }
      ),
    [catalog.moduleBrands]
  );

  const isCustomModuleBrand = moduleBrand === CUSTOM_MODULE_BRAND_VALUE;
  const selectedModuleBrand = isCustomModuleBrand ? customModuleBrandName.trim() || CUSTOM_MODULE_BRAND_VALUE : moduleBrand;

  useEffect(() => {
    if (moduleBrandOptions.length && !moduleBrandOptions.some((option) => option.value === moduleBrand)) {
      setModuleBrand(moduleBrandOptions[0].value);
    }
  }, [moduleBrand, moduleBrandOptions]);

  const psuModelLabel = catalog.powerSupplyModels?.[psuBrand] || catalog.psuModelLabel;
  const psuPicked = useMemo(() => pickPSUModel(psuModelLabel), [psuModelLabel]);

  // âœ… PSU unit price (auto + manual) â€” NEW
  const psUnitPriceAuto = useMemo(() => Number(catalog.powerSupplyPrices?.[psuBrand] ?? catalog.powerSupplyPrice ?? 0), [catalog.powerSupplyPrices, catalog.powerSupplyPrice, psuBrand]);
  useEffect(() => {
    // model/type/tech/cabinet change à¦¹à¦²à§‡à¦“ default reset
    setPsPriceOverrideEnabled(false);
    setPsPriceOverrideStr(psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : "");
  }, [dispType, modelId, technology, cabinetEnabled, psUnitPriceAuto]);

  const psUnitPrice = useMemo(() => {
    if (!psPriceOverrideEnabled) return psUnitPriceAuto;
    const v = parseFloat(psPriceOverrideStr);
    if (isNaN(v) || v <= 0) return psUnitPriceAuto;
    return v;
  }, [psPriceOverrideEnabled, psPriceOverrideStr, psUnitPriceAuto]);

  // âœ… Controller auto price
  const controllerPriceAuto = useMemo(() => {
    if (!controllerId) return 0;
    if (ctrlSystemBrand === "Novastar") return novastarControllerPriceById(dispType, controllerId, catalog.novastarControllers);
    return controllerPriceById(controllerId, catalog.controllers);
  }, [ctrlSystemBrand, dispType, controllerId, catalog.novastarControllers, catalog.controllers]);

  // âœ… reset controller override when selection changes
  useEffect(() => {
    setControllerPriceOverrideEnabled(false);
    setControllerPriceOverrideStr(controllerPriceAuto ? String(Math.round(controllerPriceAuto)) : "");
  }, [ctrlSystemBrand, dispType, controllerId, controllerPriceAuto]);

  // âœ… final controller price
  const controllerPrice = useMemo(() => {
    if (!controllerPriceOverrideEnabled) return controllerPriceAuto;
    const v = parseFloat(controllerPriceOverrideStr);
    if (isNaN(v) || v <= 0) return controllerPriceAuto;
    return v;
  }, [controllerPriceOverrideEnabled, controllerPriceOverrideStr, controllerPriceAuto]);

  const controllerLabel = useMemo(() => {
    if (!controllerId) return "";
    if (ctrlSystemBrand === "Novastar") {
      return getNovastarControllersForDisplayType(dispType, catalog.novastarControllers, catalog.novastarCtrlCap).find((c) => c.id === controllerId)?.label || controllerId;
    }
    return catalog.controllers.find((c) => c.id === controllerId)?.label || controllerId;
  }, [ctrlSystemBrand, dispType, controllerId, catalog.novastarControllers, catalog.novastarCtrlCap, catalog.controllers]);

  const controllerPixelCapacity = useMemo(() => {
    if (!controllerId) return 0;
    if (ctrlSystemBrand === "Novastar") {
      return getNovastarControllerMax(controllerId, dispType, catalog.novastarCtrlCap) || 0;
    }

    const match = (catalog.ctrlCap?.[dispType] || []).find((item) => item.id === controllerId);
    return Number.isFinite(match?.max) ? match.max : 0;
  }, [ctrlSystemBrand, dispType, controllerId, catalog.novastarCtrlCap, catalog.ctrlCap]);

  const novastarControllerOptions = useMemo(
    () => getNovastarControllersForDisplayType(dispType, catalog.novastarControllers, catalog.novastarCtrlCap),
    [dispType, catalog.novastarControllers, catalog.novastarCtrlCap]
  );

  const paymentTermLabel = useMemo(() => {
    const terms = catalog.paymentTerms;
    return terms.find((p) => p.id === paymentTermId)?.label || terms[0]?.label || "";
  }, [paymentTermId, catalog.paymentTerms]);

  const defaultWarrantyYears = useMemo(() => {
    if (tierId === "diamond") return 3;
    if (tierId === "platinum") return 2;
    return 1;
  }, [tierId]);

  // âœ… Snapshot
	  const snapshot = useMemo(
	    () => ({
	      quotationType: "fixed",
	      model: {
	        ...model,
        code: model.code || model.name,
        name: `${model.name} ${dispType === "indoor" ? "Indoor" : "Outdoor"}`,
      },
	      customer,
	      display,
	      quotationMode,
	      irregular: {
	        unit: "Set",
	        qty: Math.max(1, parseFloat(irregularQty || 1) || 1),
	      },

	      vatEnabled,

      discountEnabled,
      discountTk: discountEnabled ? parseFloat(discountTk || 0) : 0,

      paymentTermId,
      paymentTermLabel,
      deliveryDays: parseFloat(deliveryDays) || 0,

      items: {
        modulesQty: autoModulesQty,
        rcQty,
        psQty,

        // âœ… Cabinet
        cabinetEnabled,
        cabinetQty,
        cabinetUnitPrice,

        controllerId,
        controllerQty,
        controllerPrice,
        controllerLabel,

        receivingPicked: rcPicked,
        receivingUnitPrice: rcUnitPrice,

        psuPicked,
        customItem: {
          enabled: customItemEnabled,
          name: customItems[0]?.name.trim() || "",
          price: customItemEnabled ? parseFloat(customItems[0]?.price || 0) : 0,
        },
        customItems: customItemEnabled
          ? customItems.map((item) => ({ name: item.name.trim(), price: parseFloat(item.price || 0) }))
          : [],
        psUnitPrice, // âœ… NEW: PSU final unit price
        dispType,

        technology,
        moduleUnitPrice,

        brands: {
          module: selectedModuleBrand,
          controller: ctrlSystemBrand,
          receiving: ctrlSystemBrand,
          psu: psuBrand,
        },
        brandSelections: {
          module: moduleBrand,
        },
        cabinet: {
          optionId: selectedCabinetSize?.id || cabinetSizeId,
          sizeId: selectedCabinetSize?.sizeKey || cabinetSizeId,
          sizeLabel: cabinetSizeLabel,
          materialCode: selectedCabinetSize?.materialCode || activeCabinetMaterial,
          materialLabel: selectedCabinetSize?.materialLabel || "Aluminium",
          variantCode: selectedCabinetSize?.variantCode || "",
          variantLabel: selectedCabinetSize?.variantLabel || "",
          invoiceLabel: buildCabinetInvoiceLabel(selectedCabinetSize),
          modulesPerCabinet: cabinetModulesPerCabinet,
        },

        capacity: {
          rcModulesPerCard: getRcCapacity(
            dispType,
            model?.name || "",
            ctrlSystemBrand,
            catalog.rcCapacityHuidu,
            catalog.rcCapacityNovastar
          ),
          psModulesPerUnit: getPsuCapacity(dispType, model?.name || "", catalog.psuCapacity),
        },
      },

      accessories: {
        accessoriesMode,
        accessoriesValue: parseFloat(accessoriesValue || 0),
      },
      install: {
        installMode,
        installIsPercent,
        installValue: parseFloat(installValue || 0),
      },
      transport: {
        enabled: transportEnabled,
        value: transportEnabled ? parseFloat(transportValue || 0) : 0,
      },

      tier: catalog.priceTiers.find((t) => t.id === tierId) || catalog.priceTiers[0],
      customWarranty: customWarranty?.trim() || "",
      defaultWarrantyYears,
    }),
    [
      model,
      dispType,
      technology,
	      customer,
	      display,
	      quotationMode,
	      irregularQty,
      autoModulesQty,
      rcQty,
      psQty,
      cabinetEnabled,
      cabinetQty,
      cabinetUnitPrice,
      controllerId,
      controllerQty,
      controllerPrice,
      controllerLabel,
      rcPicked,
      rcUnitPrice,
      psuPicked,
      psUnitPrice,
      psuBrand,
      customItemEnabled,
      customItems,
      moduleBrand,
      selectedModuleBrand,
      ctrlSystemBrand,
      cabinetSizeId,
      selectedCabinetSize,
      activeCabinetMaterial,
      cabinetSizeLabel,
      cabinetModulesPerCabinet,
      accessoriesMode,
      accessoriesValue,
      installMode,
      installValue,
      transportEnabled,
      transportValue,
      tierId,
      customWarranty,
      defaultWarrantyYears,
      moduleUnitPrice,
      vatEnabled,
      discountEnabled,
      discountTk,
      installIsPercent,
      paymentTermId,
      paymentTermLabel,
      deliveryDays,
      catalog.priceTiers,
      catalog.rcCapacityHuidu,
      catalog.rcCapacityNovastar,
      catalog.psuCapacity,
    ]
	  );

  useEffect(() => {
    if (installationType !== "fixed") return;
    onChange?.(snapshot);
  }, [installationType, snapshot, onChange]);

  const computeAndSend = useCallback(
    (userSubmit = false) => {
      if (installationType !== "fixed") return;
      const result = buildTotalsForCalc({
        snapshot,
        autoModulesQty,
        moduleUnitPrice,
        rcUnitPrice,
        psUnitPrice, // âœ… NEW
        cabinetQty,
        cabinetUnitPrice,
      });
      onCalculated?.(result, snapshot, { userSubmit });
    },
    [installationType, snapshot, autoModulesQty, moduleUnitPrice, rcUnitPrice, psUnitPrice, cabinetQty, cabinetUnitPrice, onCalculated]
  );

  const handleCalculate = (e) => {
    e?.preventDefault?.();
  };

  const setCabinetSizeByKey = useCallback(
    (sizeKey) => {
      const match =
        cabinetSizeOptions.find((option) => option.sizeKey === sizeKey) ||
        cabinetAllOptions.find((option) => option.displayType === dispType && option.sizeKey === sizeKey);
      if (match) setCabinetSizeId(match.id);
    },
    [cabinetAllOptions, cabinetSizeOptions, dispType]
  );

  const snapWidthToNearestSize = useCallback(() => {
    const cabinetRows = cabinetEnabled
      ? CABINET_AREA_SIZE_ROWS[selectedCabinetSize?.sizeKey] || CABINET_AREA_SIZE_ROWS["640x480"]
      : null;
    const { widthFt, heightFt, widthValue, heightValue } = getDimensionsFromWidth(
      display.widthFt,
      cabinetRows?.widthOptions,
      cabinetRows?.heightOptions
    );

    if (!widthFt) return;

    setDisplay((d) => ({
      ...d,
      widthFt,
      heightFt,
    }));
    updateSizeSelection((prev) => {
      const next = { ...(prev || {}) };
      delete next.width;
      delete next.height;
      delete next.p3p6;
      clearSizeSelectionRows(next, CABINET_PICK_ROWS);

      if (cabinetRows) {
        next[cabinetRows.widthRow] = widthValue;
        if (heightValue !== null) next[cabinetRows.heightRow] = heightValue;
      } else {
        next.width = widthValue;
        if (heightValue !== null) next.height = heightValue;
      }

      return next;
    });
  }, [cabinetEnabled, display.widthFt, selectedCabinetSize?.sizeKey, updateSizeSelection]);

  useEffect(() => {
    hasCalculatedRef.current = true;
    computeAndSend(false);
  }, [computeAndSend]);

  // âœ… Accept preset size chips (width/height) and allow manual override afterward
  useEffect(() => {
    if (!sizePick) return;
    const autoHeight = sizePick.width !== undefined && (sizePick.row === "width" || sizePick.row === "p3p6")
      ? parseFloat(getAutoHeightFromWidth(sizePick.width))
      : null;

    const cabinetSizeKey = CABINET_SIZE_PICK_ROWS[sizePick.row];
    const isCabinetPick = Boolean(cabinetSizeKey);
    const isCabinetWidthPick = CABINET_WIDTH_PICK_ROWS.includes(sizePick.row);
    const isCabinetHeightPick = CABINET_HEIGHT_PICK_ROWS.includes(sizePick.row);

    if (cabinetSizeKey) {
      setCabinetSizeByKey(cabinetSizeKey);
    }
    setDisplay((d) => ({
      ...d,
      widthFt: sizePick.width !== undefined ? String(sizePick.width) : d.widthFt,
      heightFt:
        sizePick.height !== undefined
          ? String(sizePick.height)
          : autoHeight !== null
          ? String(autoHeight)
          : d.heightFt,
    }));
    updateSizeSelection((prev) => {
      const next = { ...(prev || {}) };

      if (sizePick.row === "width" || sizePick.row === "p3p6" || isCabinetWidthPick) {
        delete next.width;
        delete next.p3p6;
        clearSizeSelectionRows(next, CABINET_WIDTH_PICK_ROWS);
      }
      if (isCabinetHeightPick) {
        clearSizeSelectionRows(next, CABINET_HEIGHT_PICK_ROWS);
      }
      if (sizePick.row === "width" || sizePick.row === "height" || sizePick.row === "p3p6") {
        clearSizeSelectionRows(next, CABINET_PICK_ROWS);
      }
      if (isCabinetPick) {
        delete next.width;
        delete next.height;
        delete next.p3p6;
        clearSizeSelectionRows(
          next,
          CABINET_PICK_ROWS.filter((row) => CABINET_SIZE_PICK_ROWS[row] !== cabinetSizeKey)
        );
      }

      if (sizePick.width !== undefined) next[sizePick.row] = sizePick.width;
      if (sizePick.height !== undefined) next[sizePick.row] = sizePick.height;

      if (
        autoHeight !== null &&
        !Number.isNaN(autoHeight) &&
        !isCabinetPick
      ) {
        next.height = autoHeight;
      } else if (sizePick.row === "height" && sizePick.height !== undefined) {
        next.height = sizePick.height;
      }

      return next;
    });
  }, [setCabinetSizeByKey, sizePick, updateSizeSelection]);

	  const displayControlsClassName = `form-row${
	    dispType === "outdoor" && cabinetEnabled ? " form-row-cabinet-outdoor" : ""
	  }`;

	  const cabinetControls = cabinetEnabled ? (
    <>
      {dispType === "outdoor" ? (
        <label>
          Cabinet Material
          <CustomSelect
            ariaLabel="Cabinet Material"
            value={activeCabinetMaterial}
            options={cabinetMaterialOptions}
            onChange={setCabinetMaterial}
          />
        </label>
      ) : null}

      {cabinetVariantOptions.length ? (
        <label>
          Cabinet Type
          <CustomSelect
            ariaLabel="Cabinet Type"
            value={activeCabinetVariant}
            options={cabinetVariantOptions.map((variant) => ({ ...variant, label: `${variant.label} Cabinet` }))}
            onChange={setCabinetVariant}
          />
        </label>
      ) : null}

      <label>
        Cabinet Size
        <CustomSelect
          ariaLabel="Cabinet Size"
          value={selectedCabinetSize?.id || ""}
          options={cabinetSizeOptions.map((size) => ({ value: size.id, label: size.label }))}
          onChange={setCabinetSizeId}
        />
      </label>
    </>
  ) : null;

  return (
    <form onSubmit={handleCalculate} className="form-grid">
      {loading ? (
        <div className="brand-sub" style={{ marginBottom: 8 }}>
          Loading latest product catalog...
        </div>
      ) : null}
      {error ? (
        <div className="brand-sub" style={{ marginBottom: 8, color: "#b45309" }}>
          {error} (using built-in defaults).{" "}
          <button type="button" className="btn btn-light" style={{ marginLeft: 8 }} onClick={() => reload()}>
            Retry
          </button>
        </div>
	      ) : null}

	      {installationType === "rental" ? (
	        <RentalPriceForm
	          onChange={onChange}
	          onCalculated={onCalculated}
	          sizePick={rentalSizePick}
	          onSizeSelectionChange={onRentalSizeSelectionChange}
	        />
		      ) : installationType === "pa" ? (
		        <PASystemForm onChange={onChange} onCalculated={onCalculated} />
		      ) : installationType === "conference" ? (
		        <ConferenceSystemForm onChange={onChange} onCalculated={onCalculated} />
		      ) : (
	        <>
	      <section>
        <div className="form-row display-structure-row">
          {/* âœ… Cabinet options */}
          <label>
            Display Structure
            <CustomSelect
              ariaLabel="Display Structure"
              value={cabinetEnabled ? "with" : "without"}
              options={[
                { value: "without", label: "Without Cabinet" },
                { value: "with", label: "With Cabinet" },
              ]}
              onChange={(value) => setCabinetEnabled(value === "with")}
            />
          </label>

	          <label>
	            Quotation Mode
	            <CustomSelect
	              ariaLabel="Quotation Mode"
	              value={quotationMode}
	              options={[
	                { value: "regular", label: "Regular" },
	                { value: "irregular", label: "Irregular" },
	              ]}
	              onChange={setQuotationMode}
	            />
	          </label>

          <label>
            Quality
            <CustomSelect
              ariaLabel="Quality"
              value={tierId}
              options={catalog.priceTiers.map((tier) => ({
                value: tier.id,
                label: tier.note ? `${tier.label} - ${tier.note}` : tier.label,
              }))}
              onChange={setTierId}
            />
          </label>

          <label>
            Custom Warranty
            <input
              className="input"
              placeholder={`Default: ${defaultWarrantyYears} Year(s)`}
              value={customWarranty}
              onChange={(e) => setCustomWarranty(e.target.value)}
            />
          </label>

	        </div>

        {/* âœ… Technology dropdown show/hide */}
        {cabinetEnabled ? (
          <div className={displayControlsClassName} style={{ marginTop: 12 }}>
            {cabinetControls}
          </div>
        ) : null}
	      </section>

	      {quotationMode === "irregular" ? (
	        <section>
	          <h3>Irregular Quotation</h3>
	          <div className="form-row">
	            <label>
	              Unit
	              <input className="input" value="Set" readOnly />
	            </label>

	            <label>
	              Quantity
	              <input
	                className="input"
	                type="number"
	                min="1"
	                step="1"
	                value={irregularQty}
	                onFocus={() => zeroClearOnFocus(irregularQty, setIrregularQty)}
	                onChange={(e) => setIrregularQty(e.target.value)}
	                onBlur={() => zeroRestoreOnBlur(irregularQty, setIrregularQty)}
	              />
	            </label>
	          </div>
	        </section>
	      ) : null}

	      {/* Product model */}
	      <section>
        <h3>Model, Brand &amp; Size</h3>

        <div className="form-row product-model-main-row">
          <label>
            Pixel Pitch
            <CustomSelect
              ariaLabel="Pixel Pitch"
              value={modelId}
              options={modelsForType.map((m) => ({ value: m.id, label: m.name }))}
              onChange={(value) => {
                modelSelectionManualRef.current = true;
                setModelId(value);
              }}
            />
          </label>

          <label>
            Module Brand
            <CustomSelect
              ariaLabel="Module Brand"
              value={moduleBrand}
              options={moduleBrandOptions}
              onChange={setModuleBrand}
            />
          </label>

          <label>
            Width (ft)
            <input
              className="input"
              value={display.widthFt}
              onChange={(e) => {
                const nextWidth = e.target.value;
                const nextHeight = nextWidth === "" ? display.heightFt : getAutoHeightFromWidth(nextWidth);
                setDisplay((d) => ({
                  ...d,
                  widthFt: nextWidth,
                  heightFt: nextHeight,
                }));
                updateSizeSelection((prev) => {
                  const next = { ...(prev || {}) };
                  delete next.width;
                  delete next.p3p6;
                  clearSizeSelectionRows(next, CABINET_PICK_ROWS);
                  if (nextWidth === "") {
                    delete next.height;
                  } else {
                    const parsedHeight = parseFloat(nextHeight);
                    if (!Number.isNaN(parsedHeight)) next.height = parsedHeight;
                  }
                  return next;
	                });
	              }}
	              onKeyDown={(e) => {
	                if (e.key !== "Enter") return;
	                e.preventDefault();
	                snapWidthToNearestSize();
	              }}
	              placeholder="e.g. 16"
	            />
	          </label>

          <label>
            Height (ft)
            <input
              className="input"
              value={display.heightFt}
              onChange={(e) => {
                const nextHeight = e.target.value;
                setDisplay((d) => ({ ...d, heightFt: nextHeight }));
                updateSizeSelection((prev) => {
                  const next = { ...(prev || {}) };
                  clearSizeSelectionRows(next, CABINET_PICK_ROWS);
                  if (!prev?.height) return next;
                  delete next.height;
                  return next;
                });
              }}
              placeholder="e.g. 9"
            />
          </label>

          <label>
            Area (sft)
            <input
              className="input"
              value={display.sft || ""}
              onChange={(e) => {
                const nextArea = e.target.value;
                if (nextArea === "") {
                  setDisplay((d) => ({ ...d, sft: "", widthFt: "", heightFt: "" }));
                  updateSizeSelection((prev) => {
                    const next = { ...(prev || {}) };
                    delete next.width;
                    delete next.height;
                    delete next.p3p6;
                    clearSizeSelectionRows(next, CABINET_PICK_ROWS);
                    return next;
                  });
                  return;
                }
                setDisplay((d) => ({ ...d, sft: nextArea }));
              }}
              onBlur={() => {
                const nextArea = String(display.sft || "").trim();
                if (nextArea === "") return;

                const cabinetAreaRows = cabinetEnabled
                  ? CABINET_AREA_SIZE_ROWS[selectedCabinetSize?.sizeKey] || CABINET_AREA_SIZE_ROWS["640x480"]
                  : null;
                const { widthFt, heightFt } = getDimensionsFromArea(
                  nextArea,
                  cabinetAreaRows?.widthOptions,
                  cabinetAreaRows?.heightOptions
                );
                setDisplay((d) => ({
                  ...d,
                  widthFt,
                  heightFt,
                }));
                updateSizeSelection((prev) => {
                  const next = { ...(prev || {}) };
                  delete next.width;
                  delete next.height;
                  delete next.p3p6;
                  clearSizeSelectionRows(next, CABINET_PICK_ROWS);
                  if (!widthFt || !heightFt) return next;

                  const parsedWidth = parseFloat(widthFt);
                  const parsedHeight = parseFloat(heightFt);
                  if (Number.isNaN(parsedWidth) || Number.isNaN(parsedHeight)) return next;

                  if (cabinetAreaRows) {
                    next[cabinetAreaRows.widthRow] = parsedWidth;
                    next[cabinetAreaRows.heightRow] = parsedHeight;
                  } else {
                    next.width = parsedWidth;
                    next.height = parsedHeight;
                  }
                  return next;
                });
              }}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                e.preventDefault();
                e.currentTarget.blur();
              }}
              title="Enter area to auto-calculate 16:9 Width and Height"
            />
          </label>
        </div>

        {isCustomModuleBrand ? (
          <div className="form-row" style={{ marginTop: 10 }}>
            <label>
              Brand Name
              <input
                className="input"
                type="text"
                value={customModuleBrandName}
                onChange={(e) => setCustomModuleBrandName(e.target.value)}
                placeholder="e.g. Your Brand"
              />
            </label>
          </div>
        ) : null}

        <div className="form-row" style={{ marginTop: 18 }}>
          <label>
            Controller & RC Brand
            <CustomSelect
              ariaLabel="Controller and Receiving Card Brand"
              value={ctrlSystemBrand}
              options={(catalog.controllerSystemBrands || []).map((b) => ({ value: b.value, label: b.label || b.value }))}
              onChange={setCtrlSystemBrand}
            />
          </label>

          <label>
            Controller Model
            <CustomSelect
              ariaLabel="Controller Model"
              value={controllerId}
              options={[
                { value: "", label: "-- No controller (pixel over) --" },
                ...(ctrlSystemBrand === "Novastar"
                  ? novastarControllerOptions.map((c) => ({
                      value: c.id,
                      label: componentModelName(c.label),
                    }))
                  : catalog.controllers
                      .filter((c) => c.kind !== "receiving")
                      .map((c) => ({
                        value: c.id,
                        label: componentModelName(c.label),
                      }))),
              ]}
              onChange={(value) => {
                controllerSelectionManualRef.current = true;
                setControllerId(value);
              }}
            />
          </label>

          <label>
            Receiving Card
            <CustomSelect
              ariaLabel="Receiving Card"
              value={receivingCardId}
              options={receivingCardOptions}
              onChange={(value) => {
                receivingCardSelectionManualRef.current = true;
                setReceivingCardId(value);
              }}
            />
          </label>
        </div>

        <h3 className="component-price-title">Component Unit Price (Tk)</h3>
        <div className="form-row component-price-row">
          <label>
            Module Price
            <input
              className="input"
              type="number"
              value={
                modulePriceOverrideEnabled
                  ? modulePriceOverrideStr
                  : moduleUnitPriceAuto
                  ? String(Math.round(moduleUnitPriceAuto))
                  : ""
              }
              onFocus={() => {
                setModulePriceOverrideEnabled(true);
                setModulePriceOverrideStr((prev) => (prev !== "" ? prev : String(Math.round(moduleUnitPriceAuto || 0))));
              }}
              onChange={(e) => {
                setModulePriceOverrideEnabled(true);
                setModulePriceOverrideStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(modulePriceOverrideStr);
                if (!modulePriceOverrideStr || isNaN(v) || v <= 0) {
                  setModulePriceOverrideEnabled(false);
                  setModulePriceOverrideStr(moduleUnitPriceAuto ? String(Math.round(moduleUnitPriceAuto)) : "");
                }
              }}
              placeholder={moduleUnitPriceAuto ? String(Math.round(moduleUnitPriceAuto)) : "-"}
            />
          </label>

          <label>
            Controller Price
            <input
              className="input"
              type="number"
              value={
                controllerPriceOverrideEnabled
                  ? controllerPriceOverrideStr
                  : controllerPriceAuto
                  ? String(Math.round(controllerPriceAuto))
                  : ""
              }
              onFocus={() => {
                setControllerPriceOverrideEnabled(true);
                setControllerPriceOverrideStr((prev) => (prev !== "" ? prev : String(Math.round(controllerPriceAuto || 0))));
              }}
              onChange={(e) => {
                setControllerPriceOverrideEnabled(true);
                setControllerPriceOverrideStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(controllerPriceOverrideStr);
                if (!controllerPriceOverrideStr || isNaN(v) || v <= 0) {
                  setControllerPriceOverrideEnabled(false);
                  setControllerPriceOverrideStr(controllerPriceAuto ? String(Math.round(controllerPriceAuto)) : "");
                }
              }}
              placeholder={controllerPriceAuto ? String(Math.round(controllerPriceAuto)) : "-"}
              disabled={!controllerId}
            />
          </label>

          <label>
            Receiving Card Price
            <input
              className="input"
              type="number"
              value={rcPriceOverrideEnabled ? rcPriceOverrideStr : rcUnitPriceAuto ? String(Math.round(rcUnitPriceAuto)) : ""}
              onFocus={() => {
                setRcPriceOverrideEnabled(true);
                setRcPriceOverrideStr((prev) => (prev !== "" ? prev : String(Math.round(rcUnitPriceAuto || 0))));
              }}
              onChange={(e) => {
                setRcPriceOverrideEnabled(true);
                setRcPriceOverrideStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(rcPriceOverrideStr);
                if (!rcPriceOverrideStr || isNaN(v) || v <= 0) {
                  setRcPriceOverrideEnabled(false);
                  setRcPriceOverrideStr(rcUnitPriceAuto ? String(Math.round(rcUnitPriceAuto)) : "");
                }
              }}
              placeholder={rcUnitPriceAuto ? String(Math.round(rcUnitPriceAuto)) : "-"}
            />
          </label>

          <label>
            Power Supply Price
            <input
              className="input"
              type="number"
              value={psPriceOverrideEnabled ? psPriceOverrideStr : psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : ""}
              onFocus={() => {
                setPsPriceOverrideEnabled(true);
                setPsPriceOverrideStr((prev) => (prev !== "" ? prev : String(Math.round(psUnitPriceAuto || 0))));
              }}
              onChange={(e) => {
                setPsPriceOverrideEnabled(true);
                setPsPriceOverrideStr(e.target.value);
              }}
              onBlur={() => {
                const v = parseFloat(psPriceOverrideStr);
                if (!psPriceOverrideStr || isNaN(v) || v <= 0) {
                  setPsPriceOverrideEnabled(false);
                  setPsPriceOverrideStr(psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : "");
                }
              }}
              placeholder={psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : "-"}
            />
          </label>

        </div>

	        <div className="form-row" style={{ marginTop: 10, gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}>
	          <label>
	            Total Module Pixels
	            <input className="input pixel-value-input" value={pixelFormatter.format(displayTotalModulePixels)} readOnly />
          </label>

          <label>
            Controller Pixel Capacity
            <input
              className="input pixel-value-input"
              value={controllerPixelCapacity ? pixelFormatter.format(controllerPixelCapacity) : ""}
              placeholder="-"
              readOnly
            />
          </label>
        </div>
      </section>
      

	      {/* Component Quantity */}
	      <section>
	        <h3>Component Quantity</h3>

        {cabinetEnabled ? (
          <div className="form-row">
            <label>
              Cabinet (pcs)
              <span style={{ fontSize: 12, color: "#64748b" }}>auto: {autoCabinetQty || 0} ({cabinetSizeLabel})</span>
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={cabinetQtyOverrideEnabled ? cabinetQtyOverrideStr : autoCabinetQty || 0}
                onFocus={() => {
                  setCabinetQtyOverrideEnabled(true);
                  setCabinetQtyOverrideStr((previous) => (previous !== "" ? previous : String(autoCabinetQty || 0)));
                }}
                onChange={(e) => {
                  setCabinetQtyOverrideEnabled(true);
                  setCabinetQtyOverrideStr(e.target.value);
                }}
                onBlur={() => {
                  const value = parseFloat(cabinetQtyOverrideStr);
                  if (cabinetQtyOverrideStr === "" || !Number.isFinite(value) || value < 0) {
                    setCabinetQtyOverrideEnabled(false);
                    setCabinetQtyOverrideStr(String(autoCabinetQty || 0));
                  }
                }}
              />
            </label>

            {/* âœ… Cabinet Case Unit Price manual override */}
            <label>
              Cabinet Case Unit Price (Tk)
              <span style={{ fontSize: 12, color: "#64748b" }}>
                default: Tk {Math.round(cabinetUnitPriceAuto).toLocaleString("en-BD")}
              </span>
              <input
                className="input"
                type="number"
                value={
                  cabinetPriceOverrideEnabled
                    ? cabinetPriceOverrideStr
                    : cabinetUnitPriceAuto
                    ? String(Math.round(cabinetUnitPriceAuto))
                    : ""
                }
                onFocus={() => {
                  setCabinetPriceOverrideEnabled(true);
                  setCabinetPriceOverrideStr((prev) => (prev !== "" ? prev : String(Math.round(cabinetUnitPriceAuto || 0))));
                }}
                onChange={(e) => {
                  setCabinetPriceOverrideEnabled(true);
                  setCabinetPriceOverrideStr(e.target.value);
                }}
                onBlur={() => {
                  const v = parseFloat(cabinetPriceOverrideStr);
                  if (!cabinetPriceOverrideStr || isNaN(v) || v <= 0) {
                    setCabinetPriceOverrideEnabled(false);
                    setCabinetPriceOverrideStr(String(Math.round(cabinetUnitPriceAuto || 0)));
                  }
                }}
                placeholder={cabinetUnitPriceAuto ? String(Math.round(cabinetUnitPriceAuto)) : "-"}
              />
            </label>
          </div>
        ) : null}

	        <div className="form-row component-quantity-row" style={{ marginTop: 10 }}>
	          <label>
	            LED Module (pcs)
	            <input className="input" type="number" value={autoModulesQty || 0} readOnly />
	            {cabinetEnabled ? (
	              <span style={{ fontSize: 12, color: "#64748b" }}>
	                {cabinetQty || 0} cabinet x {cabinetModulesPerCabinet} modules
	              </span>
	            ) : null}
	          </label>

	          <label>
	            Receiving Card (pcs)
	            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={rcQty}
              onChange={(e) => setRcQty(parseFloat(e.target.value || 0))}
            />
          </label>

	          <label>
	            Power Supply (pcs)
	            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={psQty}
	              onChange={(e) => setPsQty(parseFloat(e.target.value || 0))}
	            />
	          </label>

	          <label>
	            Power Supply Brand
	            <CustomSelect
	              ariaLabel="Power Supply Brand"
	              value={psuBrand}
	              options={psuBrandOptions}
	              onChange={setPsuBrand}
	            />
	          </label>

	        </div>
      </section>

      <div className="cost-options-row">
        {/* Structure & Accessories */}
        <section>
          <h3>Structure & Accessories</h3>

          <CustomSelect
            ariaLabel="Structure & Accessories Cost Mode"
            value={accessoriesMode}
            options={[
              { value: "auto", label: "Auto" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={setAccessoriesMode}
          />

          {accessoriesMode === "manual" ? (
            <div className="install-box manual accessories-manual-box">
              <input
                className="input"
                type="number"
                value={accessoriesValue}
                onFocus={() => zeroClearOnFocus(accessoriesValue, setAccessoriesValue, false)}
                onChange={(e) => setAccessoriesValue(e.target.value)}
                onBlur={() => zeroRestoreOnBlur(accessoriesValue, setAccessoriesValue, false)}
                placeholder="Structure & Accessories Cost (Tk)"
                aria-label="Structure & Accessories Cost (Tk)"
              />
            </div>
          ) : null}
        </section>

        {/* Installation */}
        <section>
          <h3>Installation Cost</h3>

          <CustomSelect
            ariaLabel="Installation Cost Mode"
            value={installMode}
            options={[
              { value: "auto", label: "Auto" },
              { value: "manual", label: "Manual" },
            ]}
            onChange={setInstallMode}
          />

          {installMode === "manual" ? (
            <div className="install-box manual">
              <input
                className="input"
                type="number"
                value={installValue}
                onFocus={() => zeroClearOnFocus(installValue, setInstallValue, false)}
                onChange={(e) => setInstallValue(e.target.value)}
                onBlur={() => zeroRestoreOnBlur(installValue, setInstallValue, false)}
                placeholder="Installation Cost (Tk)"
                aria-label="Installation Cost (Tk)"
              />
            </div>
          ) : null}
        </section>

        <section>
          <h3>Transport Cost</h3>

          <label aria-label="Transport Cost Option">
            <CustomSelect
              ariaLabel="Transport Cost Option"
              value={transportEnabled ? "with" : "without"}
              options={[
                { value: "without", label: "Without Transport Cost" },
                { value: "with", label: "With Transport Cost" },
              ]}
              onChange={(value) => {
                const enabled = value === "with";
                setTransportEnabled(enabled);
                if (!enabled) setTransportValue(0);
              }}
            />
          </label>

          {transportEnabled ? (
            <>
              <label>
                Transport Cost (Tk)
                <input
                  className="input"
                  type="number"
                  value={transportValue}
                  onFocus={() => zeroClearOnFocus(transportValue, setTransportValue, false)}
                  onChange={(e) => setTransportValue(e.target.value)}
                  onBlur={() => zeroRestoreOnBlur(transportValue, setTransportValue, false)}
                  placeholder="e.g. 15000"
                />
              </label>

              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Invoice table-e `Transport Cost` name ar `Lot` unit diye row show hobe, ar amount Grand Total-e jog hobe.
              </div>
            </>
          ) : null}
        </section>
      </div>

      {/* âœ… VAT option */}
      <div className="optional-options-row">
        {/* Custom Field */}
        <section>
          <div className="inline" style={{ justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ margin: 0 }}>Custom Field</h3>
            {customItemEnabled ? (
              <button
                type="button"
                className="btn secondary"
                style={{ backgroundColor: "#2563eb", borderColor: "#2563eb", color: "#ffffff" }}
                onClick={() => setCustomItems((current) => [...current, { id: nextCustomItemId.current++, name: "", price: 0 }])}
              >
                + Add Custom Field
              </button>
            ) : null}
          </div>

          <CustomSelect
            ariaLabel="Custom Field Option"
            value={customItemEnabled ? "with" : "without"}
            options={[
              { value: "without", label: "Without Custom Field" },
              { value: "with", label: "With Custom Field" },
            ]}
            onChange={(value) => {
              const enabled = value === "with";
              setCustomItemEnabled(enabled);
              if (!enabled) {
                setCustomItems([{ id: nextCustomItemId.current++, name: "", price: 0 }]);
              }
            }}
          />

          {customItemEnabled ? (
            <div style={{ marginTop: 10 }}>
              {customItems.map((item, index) => (
                <div className="form-row" style={{ marginTop: index ? 10 : 0 }} key={item.id}>
                  <label>
                    Item Name
                    <input
                      className="input"
                      type="text"
                      aria-label={`Custom item name ${index + 1}`}
                      value={item.name}
                      onChange={(e) => setCustomItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, name: e.target.value } : entry))}
                      placeholder="e.g. Spare Module"
                    />
                  </label>

                  <label>
                    Price (Tk)
                    <input
                      className="input"
                      type="number"
                      min="0"
                      aria-label={`Custom item price ${index + 1}`}
                      value={item.price}
                      onChange={(e) => setCustomItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, price: e.target.value } : entry))}
                      placeholder="e.g. 2500"
                    />
                  </label>

                  {customItems.length > 1 ? (
                    <button type="button" className="btn secondary" onClick={() => setCustomItems((current) => current.filter((entry) => entry.id !== item.id))}>
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}
        </section>

        {/* Discount */}
        <section>
          <h3>Discount</h3>

          <CustomSelect
            ariaLabel="Discount Option"
            value={discountEnabled ? "with" : "without"}
            options={[
              { value: "without", label: "Without Discount" },
              { value: "with", label: "With Discount" },
            ]}
            onChange={(value) => {
              const enabled = value === "with";
              setDiscountEnabled(enabled);
              if (!enabled) setDiscountTk(0);
            }}
          />

          {discountEnabled ? (
            <div style={{ marginTop: 10 }}>
              <label>
                Special Discount (Tk)
                <input
                  className="input"
                  type="number"
                  value={discountTk}
                  onFocus={() => zeroClearOnFocus(discountTk, setDiscountTk, false)}
                  onChange={(e) => setDiscountTk(e.target.value)}
                  onBlur={() => zeroRestoreOnBlur(discountTk, setDiscountTk, false)}
                  placeholder="e.g. 5000"
                />
              </label>

              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                This discount is deducted from the VAT-inclusive Grand Total to calculate the payable amount.
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <div className="vat-terms-group">
        <h3 className="vat-terms-title">VAT, Payment Terms &amp; Delivery Time</h3>
        <div className="vat-terms-row">
      <section>
        <h3>VAT</h3>

        <CustomSelect
          ariaLabel="VAT Option"
          value={vatEnabled ? "with" : "without"}
          options={[
            { value: "without", label: "Without VAT" },
            { value: "with", label: "With VAT (10%)" },
          ]}
          onChange={(value) => setVatEnabled(value === "with")}
        />
      </section>

      {/* âœ… Discount toggle */}
      {/* âœ… Payment Terms selection */}
      <section>
        <h3>Payment Terms (For T&amp;C)</h3>

        <CustomSelect
          ariaLabel="Payment Terms"
          value={paymentTermId}
          options={catalog.paymentTerms.map((term) => ({ value: term.id, label: term.label }))}
          onChange={setPaymentTermId}
        />
      </section>

      <section>
        <h3>Delivery Time (days)</h3>
        <input
          className="input"
          aria-label="Delivery Time (days)"
          type="number"
          value={deliveryDays}
          onChange={(e) => setDeliveryDays(e.target.value)}
          placeholder="e.g. 45"
        />
      </section>
      </div>
      </div>

      {/* Customer */}
	      <section>
	        <h3>Client's Information</h3>
        <div className="form-row">
          <TextField label="Name" value={customer.name} onChange={(v) => setCustomer((c) => ({ ...c, name: v }))} />
          <TextField
            label="Designation"
            value={customer.position}
            onChange={(v) => setCustomer((c) => ({ ...c, position: v }))}
          />
          <TextField
            label="Organization Name"
            value={customer.company}
            onChange={(v) => setCustomer((c) => ({ ...c, company: v }))}
          />
          <TextField label="Mobile Number" value={customer.mobile} onChange={(v) => setCustomer((c) => ({ ...c, mobile: v }))} />
          <TextField label="Address" value={customer.address} onChange={(v) => setCustomer((c) => ({ ...c, address: v }))} />
        </div>
	      </section>
	      </>
	      )}

	    </form>
  );
}

function TextField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input className="input" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

