// ===============================
// src/components/PriceForm.jsx
// ===============================
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useCatalog } from "../context/CatalogContext.jsx";
import { getCabinetFootprintFt } from "../data/defaultQuotationCatalog.js";
import {
  moduleFootprintFt,
  pickReceivingCard,
  getRcCapacity,
  getPsuCapacity,
  pickPSUModel,
  gridAndPixels,
  pickControllerByPixels,
  pickNovastarControllerByPixels,
  controllerPriceById,
  novastarControllerPriceById,
  roundInt,
} from "../lib/priceFormCatalogHelpers.js";
import { calcAll } from "../lib/calc.js";

/* =========================
   ✅ ZERO-CLEAR INPUT HELPERS
   ========================= */
function zeroClearOnFocus(value, setter, disabled = false) {
  if (disabled) return;
  if (String(value) === "0") setter("");
}
function zeroRestoreOnBlur(value, setter, disabled = false) {
  if (disabled) return;
  if (value === "" || value === null || typeof value === "undefined") setter(0);
}

function buildTotalsForCalc({
  snapshot,
  autoModulesQty,
  moduleUnitPrice,
  rcUnitPrice,
  psUnitPrice, // ✅ NEW
  cabinetQty,
  cabinetUnitPrice,
}) {
  const { items, install, display, accessories } = snapshot;

  return calcAll({
    modulesQty: autoModulesQty,

    // ✅ With Cabinet হলে rc/ps cabinetQty অনুযায়ী যাবে (snapshot এ already set)
    rcQty: items.rcQty ?? 0,
    psQty: items.psQty ?? 0,

    controllerQty: items.controllerQty ?? 0,
    controllerPrice: items.controllerPrice ?? 0,

    unitModule: moduleUnitPrice,
    unitRC: rcUnitPrice,

    // ✅ PSU unit price (manual override capable)
    unitPS: psUnitPrice,

    // ✅ Cabinet (only when enabled) — NOW uses manual override price
    cabinetQty: items?.cabinetEnabled ? (cabinetQty || 0) : 0,
    unitCabinet: items?.cabinetEnabled ? (cabinetUnitPrice || 0) : 0,

    accessoriesMode: accessories.accessoriesMode,
    accessoriesValue: accessories.accessoriesValue,

    installMode: install.installMode,
    installIsPercent: install.installIsPercent,
    installValue: install.installValue,

    sft: display?.sft,
    dispType: snapshot.items?.dispType || "indoor",

    vatEnabled: snapshot.vatEnabled,

    discountEnabled: snapshot.discountEnabled,
    discountTk: snapshot.discountTk ?? 0,
  });
}

export default function PriceForm({ onChange, onCalculated }) {
  const { catalog, loading, error, reload } = useCatalog();
  const { w: CAB_W_FT, h: CAB_H_FT } = useMemo(() => getCabinetFootprintFt(catalog.physical), [catalog.physical]);

  const [dispType, setDispType] = useState("indoor");

  // ✅ Cabinet mode (default: without cabinet)
  const [cabinetEnabled, setCabinetEnabled] = useState(false);

  // ✅ VAT (default OFF)
  const [vatEnabled, setVatEnabled] = useState(false);

  // ✅ Discount (default OFF)
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountTk, setDiscountTk] = useState(0);

  // ✅ Technology (default SMD)
  const [technology, setTechnology] = useState("smd"); // smd | gob | cob

  // ✅ Payment Term (default 100%)
  const [paymentTermId, setPaymentTermId] = useState("PT_100");

  // ✅ Outdoor হলে force SMD
  useEffect(() => {
    if (dispType === "outdoor" && technology !== "smd") {
      setTechnology("smd");
    }
  }, [dispType, technology]);

  // ✅ Technology list: Outdoor => only SMD
  const techOptions = useMemo(() => {
    if (dispType === "outdoor") return catalog.technologiesAll.filter((t) => t.id === "smd");
    return catalog.technologiesAll;
  }, [dispType, catalog.technologiesAll]);

  // ✅ models list depends on technology + display type
  const modelsForType = useMemo(() => {
    const techBlock = catalog.modelGroups[technology] || catalog.modelGroups.smd;
    return techBlock?.[dispType] || [];
  }, [technology, dispType, catalog.modelGroups]);

  const [modelId, setModelId] = useState(modelsForType[0]?.id || "");

  const model = useMemo(() => {
    if (!modelsForType.length) return { id: "", name: "P1.25", prices: { gold: 0, platinum: 0, diamond: 0 } };
    return modelsForType.find((m) => m.id === modelId) ?? modelsForType[0];
  }, [modelId, modelsForType]);

  const [ctrlSystemBrand, setCtrlSystemBrand] = useState("Novastar"); // Huidu | Novastar

  const [controllerId, setControllerId] = useState(catalog.controllers[0]?.id || "");
  const [controllerQty, setControllerQty] = useState(1);

  const [customer, setCustomer] = useState({ name: "", company: "", address: "", mobile: "", position: "" });

  // ✅ IMPORTANT: sft will be auto ONLY
  const [display, setDisplay] = useState({ widthFt: "", heightFt: "", sft: "" });

  const [rcQty, setRcQty] = useState(10);
  const [psQty, setPsQty] = useState(17);

  const [accessoriesMode, setAccessoriesMode] = useState("auto");
  const [accessoriesValue, setAccessoriesValue] = useState(0);

  const [installMode, setInstallMode] = useState("auto");

  // ✅ IMPORTANT: Installation percent option removed; always Tk
  const installIsPercent = false;
  const [installValue, setInstallValue] = useState(0);

  const [moduleBrand, setModuleBrand] = useState("Lampro by Unilumin");

  const [tierId, setTierId] = useState("gold");
  const hasCalculatedRef = useRef(false);
  const [customWarranty, setCustomWarranty] = useState("");

  // ✅ Module Unit Price override
  const [modulePriceOverrideStr, setModulePriceOverrideStr] = useState("");
  const [modulePriceOverrideEnabled, setModulePriceOverrideEnabled] = useState(false);

  // ✅ Receiving Card Unit Price override
  const [rcPriceOverrideStr, setRcPriceOverrideStr] = useState("");
  const [rcPriceOverrideEnabled, setRcPriceOverrideEnabled] = useState(false);

  // ✅ Power Supply Unit Price override (✅ NEW)
  const [psPriceOverrideStr, setPsPriceOverrideStr] = useState("");
  const [psPriceOverrideEnabled, setPsPriceOverrideEnabled] = useState(false);

  // ✅ Controller Price override
  const [controllerPriceOverrideStr, setControllerPriceOverrideStr] = useState("");
  const [controllerPriceOverrideEnabled, setControllerPriceOverrideEnabled] = useState(false);

  // ✅ Cabinet Unit Price override (NEW)
  const [cabinetPriceOverrideStr, setCabinetPriceOverrideStr] = useState("");
  const [cabinetPriceOverrideEnabled, setCabinetPriceOverrideEnabled] = useState(false);

  // display type / technology change -> reset model
  useEffect(() => {
    const first = (catalog.modelGroups[technology] || catalog.modelGroups.smd)?.[dispType]?.[0];
    setModelId(first?.id || "");
  }, [dispType, technology, catalog.modelGroups]);

  // ✅ area auto (LOCKED)
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

  // ✅ Cabinet qty from Width/Height
  const cabinetQty = useMemo(() => {
    if (!cabinetEnabled) return 0;
    const w = parseFloat(display.widthFt);
    const h = parseFloat(display.heightFt);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return 0;

    const across = roundInt(w / CAB_W_FT);
    const down = roundInt(h / CAB_H_FT);
    return across * down;
  }, [cabinetEnabled, display.widthFt, display.heightFt, CAB_W_FT, CAB_H_FT]);

  const autoModulesQty = useMemo(() => {
    const w = parseFloat(display.widthFt);
    const h = parseFloat(display.heightFt);
    if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) return 0;

    // ✅ With cabinet: modules = cabinetQty * 6
    if (cabinetEnabled) return (cabinetQty || 0) * catalog.modulesPerCabinet;

    // ✅ Without cabinet: existing logic
    const fp = moduleFootprintFt(model.id || model.name, catalog.physical);
    const across = roundInt(w / fp.w);
    const down = roundInt(h / fp.h);
    return across * down;
  }, [display.widthFt, display.heightFt, model, cabinetEnabled, cabinetQty, catalog.modulesPerCabinet, catalog.physical]);

  // ✅ AUTO module price by tier
  const moduleUnitPriceAuto = useMemo(() => {
    const p = model?.prices || {};
    return p[tierId] ?? 0;
  }, [model, tierId]);

  // ✅ reset module override on model/tier/tech/type change
  useEffect(() => {
    setModulePriceOverrideEnabled(false);
    setModulePriceOverrideStr(moduleUnitPriceAuto ? String(Math.round(moduleUnitPriceAuto)) : "");
  }, [modelId, tierId, technology, dispType, moduleUnitPriceAuto]);

  // ✅ final module price
  const moduleUnitPrice = useMemo(() => {
    if (!modulePriceOverrideEnabled) return moduleUnitPriceAuto;
    const v = parseFloat(modulePriceOverrideStr);
    if (isNaN(v) || v <= 0) return moduleUnitPriceAuto;
    return v;
  }, [modulePriceOverrideEnabled, modulePriceOverrideStr, moduleUnitPriceAuto]);

  // ✅ Cabinet Unit Price (auto + manual) — NEW
  const cabinetUnitPriceAuto = useMemo(() => catalog.cabinetCasePrice, [catalog.cabinetCasePrice]);
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

  const { totalPixels } = useMemo(
    () => gridAndPixels(model.name, display.widthFt, display.heightFt, catalog.moduleRes, catalog.physical),
    [model.name, display.widthFt, display.heightFt, catalog.moduleRes, catalog.physical]
  );

  useEffect(() => {
    const autoLocal =
      ctrlSystemBrand === "Novastar"
        ? pickNovastarControllerByPixels(dispType, totalPixels, catalog.novastarControllers)
        : pickControllerByPixels(dispType, totalPixels, catalog.ctrlCap);

    if (!autoLocal) {
      setControllerId("");
      setControllerQty(0);
      return;
    }
    setControllerId(autoLocal.id);
    setControllerQty(1);
  }, [ctrlSystemBrand, dispType, totalPixels, catalog.novastarControllers, catalog.ctrlCap]);

  const rcPicked = useMemo(
    () => pickReceivingCard(dispType, model?.name || "", ctrlSystemBrand, technology, catalog.receivingCards),
    [dispType, model?.name, ctrlSystemBrand, technology, catalog.receivingCards]
  );

  // ✅ RC auto unit price + reset override when picked changes
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

  const autoRcQty = useMemo(() => {
    // ✅ With cabinet: RC = cabinet qty
    if (cabinetEnabled) return cabinetQty || 0;

    const cap = getRcCapacity(dispType, model.name, ctrlSystemBrand, catalog.rcCapacityHuidu, catalog.rcCapacityNovastar);
    return cap > 0 ? Math.ceil((autoModulesQty || 0) / cap) : 0;
  }, [dispType, model.name, autoModulesQty, ctrlSystemBrand, cabinetEnabled, cabinetQty, catalog.rcCapacityHuidu, catalog.rcCapacityNovastar]);

  const autoPsQty = useMemo(() => {
    // ✅ With cabinet: PSU = cabinet qty
    if (cabinetEnabled) return cabinetQty || 0;

    const cap = getPsuCapacity(dispType, model.name, catalog.psuCapacity);
    return cap > 0 ? Math.ceil((autoModulesQty || 0) / cap) : 0;
  }, [dispType, model.name, autoModulesQty, cabinetEnabled, cabinetQty, catalog.psuCapacity]);

  useEffect(() => setRcQty(autoRcQty), [autoRcQty, dispType, modelId, display.widthFt, display.heightFt, cabinetEnabled]);
  useEffect(() => setPsQty(autoPsQty), [autoPsQty, dispType, modelId, display.widthFt, display.heightFt, cabinetEnabled]);

  const psuPicked = useMemo(() => pickPSUModel(catalog.psuModelLabel), [catalog.psuModelLabel]);

  // ✅ PSU unit price (auto + manual) — NEW
  const psUnitPriceAuto = useMemo(() => Number(catalog.powerSupplyPrice || 0), [catalog.powerSupplyPrice]);
  useEffect(() => {
    // model/type/tech/cabinet change হলেও default reset
    setPsPriceOverrideEnabled(false);
    setPsPriceOverrideStr(psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : "");
  }, [dispType, modelId, technology, cabinetEnabled, psUnitPriceAuto]);

  const psUnitPrice = useMemo(() => {
    if (!psPriceOverrideEnabled) return psUnitPriceAuto;
    const v = parseFloat(psPriceOverrideStr);
    if (isNaN(v) || v <= 0) return psUnitPriceAuto;
    return v;
  }, [psPriceOverrideEnabled, psPriceOverrideStr, psUnitPriceAuto]);

  // ✅ Controller auto price
  const controllerPriceAuto = useMemo(() => {
    if (!controllerId) return 0;
    if (ctrlSystemBrand === "Novastar") return novastarControllerPriceById(dispType, controllerId, catalog.novastarControllers);
    return controllerPriceById(controllerId, catalog.controllers);
  }, [ctrlSystemBrand, dispType, controllerId, catalog.novastarControllers, catalog.controllers]);

  // ✅ reset controller override when selection changes
  useEffect(() => {
    setControllerPriceOverrideEnabled(false);
    setControllerPriceOverrideStr(controllerPriceAuto ? String(Math.round(controllerPriceAuto)) : "");
  }, [ctrlSystemBrand, dispType, controllerId, controllerPriceAuto]);

  // ✅ final controller price
  const controllerPrice = useMemo(() => {
    if (!controllerPriceOverrideEnabled) return controllerPriceAuto;
    const v = parseFloat(controllerPriceOverrideStr);
    if (isNaN(v) || v <= 0) return controllerPriceAuto;
    return v;
  }, [controllerPriceOverrideEnabled, controllerPriceOverrideStr, controllerPriceAuto]);

  const controllerLabel = useMemo(() => {
    if (!controllerId) return "";
    if (ctrlSystemBrand === "Novastar") {
      return (catalog.novastarControllers[dispType] || []).find((c) => c.id === controllerId)?.label || controllerId;
    }
    return catalog.controllers.find((c) => c.id === controllerId)?.label || controllerId;
  }, [ctrlSystemBrand, dispType, controllerId, catalog.novastarControllers, catalog.controllers]);

  const paymentTermLabel = useMemo(() => {
    const terms = catalog.paymentTerms;
    return terms.find((p) => p.id === paymentTermId)?.label || terms[0]?.label || "";
  }, [paymentTermId, catalog.paymentTerms]);

  const defaultWarrantyYears = useMemo(() => {
    if (tierId === "diamond") return 3;
    if (tierId === "platinum") return 2;
    return 1;
  }, [tierId]);

  // ✅ Snapshot
  const snapshot = useMemo(
    () => ({
      model: {
        ...model,
        name: `${model.name} ${dispType === "indoor" ? "Indoor" : "Outdoor"}`,
      },
      customer,
      display,

      vatEnabled,

      discountEnabled,
      discountTk: discountEnabled ? parseFloat(discountTk || 0) : 0,

      paymentTermId,
      paymentTermLabel,

      items: {
        modulesQty: autoModulesQty,
        rcQty,
        psQty,

        // ✅ Cabinet
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
        psUnitPrice, // ✅ NEW: PSU final unit price
        dispType,

        technology,
        moduleUnitPrice,

        brands: {
          module: moduleBrand,
          controller: ctrlSystemBrand,
          receiving: ctrlSystemBrand,
          psu: "G-Energy",
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
      moduleBrand,
      ctrlSystemBrand,
      accessoriesMode,
      accessoriesValue,
      installMode,
      installValue,
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
      catalog.priceTiers,
      catalog.rcCapacityHuidu,
      catalog.rcCapacityNovastar,
      catalog.psuCapacity,
    ]
  );

  useEffect(() => onChange?.(snapshot), [snapshot, onChange]);

  const computeAndSend = useCallback(
    (userSubmit = false) => {
      const result = buildTotalsForCalc({
        snapshot,
        autoModulesQty,
        moduleUnitPrice,
        rcUnitPrice,
        psUnitPrice, // ✅ NEW
        cabinetQty,
        cabinetUnitPrice,
      });
      onCalculated?.(result, snapshot, { userSubmit });
    },
    [snapshot, autoModulesQty, moduleUnitPrice, rcUnitPrice, psUnitPrice, cabinetQty, cabinetUnitPrice, onCalculated]
  );

  const handleCalculate = (e) => {
    e?.preventDefault?.();
    hasCalculatedRef.current = true;
    computeAndSend(true);
  };

  useEffect(() => {
    if (hasCalculatedRef.current) computeAndSend(false);
  }, [computeAndSend]);

  return (
    <form onSubmit={handleCalculate} className="form-grid">
      {loading ? (
        <div className="brand-sub" style={{ marginBottom: 8 }}>
          Loading latest product catalog…
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

      {/* === Display Type === */}
      <section>
        <h3>Display Type</h3>

        <div className="inline" style={{ flexWrap: "wrap", gap: 18 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={dispType === "indoor"} onChange={() => setDispType("indoor")} />
            <span>Indoor</span>
          </label>

          <label className="inline">
            <input className="radio" type="radio" checked={dispType === "outdoor"} onChange={() => setDispType("outdoor")} />
            <span>Outdoor</span>
          </label>

          {/* ✅ Cabinet options */}
          <label className="inline" style={{ marginLeft: 50 }}>
            <input className="radio" type="radio" checked={!cabinetEnabled} onChange={() => setCabinetEnabled(false)} />
            <span>Without Cabinet</span>
          </label>

          <label className="inline">
            <input className="radio" type="radio" checked={cabinetEnabled} onChange={() => setCabinetEnabled(true)} />
            <span>With Cabinet</span>
          </label>
        </div>

        {/* ✅ Technology dropdown show/hide */}
        {techOptions.length > 1 ? (
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>
              Technology
              <select className="select" value={technology} onChange={(e) => setTechnology(e.target.value)}>
                {techOptions.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>

            {cabinetEnabled ? (
              <label>
                Cabinet Size
                <input className="input" value="640mm × 480mm" readOnly />
              </label>
            ) : null}
          </div>
        ) : (
          <div className="form-row" style={{ marginTop: 12 }}>
            <label>
              Technology
              <input className="input" value="SMD" readOnly />
            </label>

            {cabinetEnabled ? (
              <label>
                Cabinet Size
                <input className="input" value="640mm × 480mm" readOnly />
              </label>
            ) : null}
          </div>
        )}
      </section>

      {/* Product model */}
      <section>
        <h3>Product Model</h3>

        <div className="form-row">
          <label>
            Select Model (Pixel Pitch)
            <select className="select" value={modelId} onChange={(e) => setModelId(e.target.value)}>
              {modelsForType.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Module Brand
            <select className="select" value={moduleBrand} onChange={(e) => setModuleBrand(e.target.value)}>
              {(catalog.moduleBrands || []).map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label || b.value}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="form-row">
          <label>
            Width (ft)
            <input
              className="input"
              value={display.widthFt}
              onChange={(e) => setDisplay((d) => ({ ...d, widthFt: e.target.value }))}
              placeholder="e.g. 16"
            />
          </label>

          <label>
            Height (ft)
            <input
              className="input"
              value={display.heightFt}
              onChange={(e) => setDisplay((d) => ({ ...d, heightFt: e.target.value }))}
              placeholder="e.g. 9"
            />
          </label>

          {/* ✅ LOCKED: Area auto only */}
          <label>
            Area (sft)
            <input className="input" value={display.sft || ""} readOnly title="Auto calculated from Width × Height" />
          </label>
        </div>

        <div className="tier-row" style={{ marginTop: 12 }}>
          {catalog.priceTiers.map((t) => (
            <button
              type="button"
              key={t.id}
              className={`tier-chip ${tierId === t.id ? "active" : ""}`}
              onClick={() => setTierId(t.id)}
              aria-pressed={tierId === t.id}
            >
              <div className="tier-title">{t.label}</div>
              <div className="tier-note">{t.note}</div>
            </button>
          ))}
        </div>

        <div className="form-row" style={{ marginTop: 10 }}>
          <label>
            Custom Warranty (optional)
            <input
              className="input"
              placeholder={`Default: ${defaultWarrantyYears} Year(s)`}
              value={customWarranty}
              onChange={(e) => setCustomWarranty(e.target.value)}
            />
          </label>
        </div>

        <div className="form-row" style={{ marginTop: 10 }}>
          <label>
            Modules (auto)
            <input className="input" value={autoModulesQty || 0} readOnly />
            {cabinetEnabled ? (
              <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                Cabinet: {cabinetQty || 0} pcs • 6 modules/cabinet
              </div>
            ) : null}
          </label>

          <label>
            Module Unit Price (Tk)
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
              placeholder={moduleUnitPriceAuto ? String(Math.round(moduleUnitPriceAuto)) : "—"}
            />
          </label>
        </div>

        <div className="form-row" style={{ marginTop: 10 }}>
          <label>
            Receiving Card (auto)
            <input className="input" value={rcPicked.label} readOnly />
          </label>

          <label>
            Receiving Card Unit Price (Tk)
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
              placeholder={rcUnitPriceAuto ? String(Math.round(rcUnitPriceAuto)) : "—"}
            />
          </label>
        </div>
      </section>

      {/* Controller */}
      <section>
        <h3>Controller and Receiving Card Brand</h3>

        <div className="form-row">
          <label>
            Controller & RC Brand
            <select className="select" value={ctrlSystemBrand} onChange={(e) => setCtrlSystemBrand(e.target.value)}>
              {(catalog.controllerSystemBrands || []).map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label || b.value}
                </option>
              ))}
            </select>
          </label>

          <label>
            Controller Model
            <select className="select" value={controllerId} onChange={(e) => setControllerId(e.target.value)}>
              <option value="">-- No controller (pixel over) --</option>

              {ctrlSystemBrand === "Novastar"
                ? (catalog.novastarControllers[dispType] || []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — ৳{Math.round(c.price).toLocaleString("en-BD")}
                    </option>
                  ))
                : catalog.controllers.filter((c) => c.kind !== "receiving").map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label} — ৳{Math.round(c.price).toLocaleString("en-BD")}
                    </option>
                  ))}
            </select>
          </label>

          <label>
            Controller Price (Tk)
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
              placeholder={controllerPriceAuto ? String(Math.round(controllerPriceAuto)) : "—"}
              disabled={!controllerId}
            />
          </label>
        </div>
      </section>
      

      {/* Quantities */}
      <section>
        <h3>Quantities</h3>

        {cabinetEnabled ? (
          <div className="form-row">
            <label>
              Cabinet (auto)
              <span style={{ fontSize: 12, color: "#64748b" }}>auto: {cabinetQty || 0} (640mm × 480mm)</span>
              <input className="input" type="number" value={cabinetQty || 0} readOnly />
            </label>

            {/* ✅ Cabinet Case Unit Price manual override */}
            <label>
              Cabinet Case Unit Price (Tk)
              <span style={{ fontSize: 12, color: "#64748b" }}>
                default: ৳{Math.round(cabinetUnitPriceAuto).toLocaleString("en-BD")}
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
                placeholder={cabinetUnitPriceAuto ? String(Math.round(cabinetUnitPriceAuto)) : "—"}
              />
            </label>
          </div>
        ) : null}

        <div className="form-row" style={{ marginTop: 10 }}>
          <label>
            Receiving Cards (pcs)
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {cabinetEnabled
                ? `auto: ${autoRcQty} (1 per cabinet)`
                : `auto: ${autoRcQty} (cap: ${getRcCapacity(
                    dispType,
                    model?.name || "",
                    ctrlSystemBrand,
                    catalog.rcCapacityHuidu,
                    catalog.rcCapacityNovastar
                  )} modules/RC)`}
            </span>
            <input
              className="input"
              type="number"
              value={rcQty}
              onChange={(e) => setRcQty(parseFloat(e.target.value || 0))}
              disabled={cabinetEnabled}
              readOnly={cabinetEnabled}
              title={cabinetEnabled ? "With cabinet, RC qty is fixed = cabinet qty" : ""}
            />
          </label>

          <label>
            Power Supplies (pcs)
            <span style={{ fontSize: 12, color: "#64748b" }}>
              {cabinetEnabled
                ? `auto: ${autoPsQty} (1 per cabinet) • ${psuPicked.model}`
                : `auto: ${autoPsQty} (cap: ${getPsuCapacity(dispType, model?.name || "", catalog.psuCapacity)} modules/PSU) • ${
                    psuPicked.model
                  }`}
            </span>
            <input
              className="input"
              type="number"
              value={psQty}
              onChange={(e) => setPsQty(parseFloat(e.target.value || 0))}
              disabled={cabinetEnabled}
              readOnly={cabinetEnabled}
              title={cabinetEnabled ? "With cabinet, PSU qty is fixed = cabinet qty" : ""}
            />
          </label>

          {/* ✅ NEW: Power Supply Unit Price manual override */}
          <label>
            Power Supply Unit Price (Tk)
            <span style={{ fontSize: 12, color: "#64748b" }}>
              default: ৳{Math.round(psUnitPriceAuto).toLocaleString("en-BD")}
            </span>
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
              placeholder={psUnitPriceAuto ? String(Math.round(psUnitPriceAuto)) : "—"}
            />
          </label>
        </div>
      </section>

      {/* Structure & Accessories */}
      <section>
        <h3>Structure & Accessories</h3>

        <div className="inline" style={{ marginBottom: 10 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={accessoriesMode === "auto"} onChange={() => setAccessoriesMode("auto")} />
            <span>Auto</span>
          </label>

          <label className="inline">
            <input
              className="radio"
              type="radio"
              checked={accessoriesMode === "manual"}
              onChange={() => setAccessoriesMode("manual")}
            />
            <span>Manual</span>
          </label>
        </div>

        <div className="install-row">
          <div className="install-box">
            <div className="install-title">Auto Accessories</div>
            <div className="install-hint">Auto mode এ area অনুযায়ী Structure & Accessories auto-calculate হবে (Outdoor হলে multiplier apply হবে)।</div>
          </div>

          <div className={`install-box manual ${accessoriesMode === "auto" ? "is-disabled" : ""}`}>
            <div className="install-title">Manual Override</div>

            <input
              className="input"
              style={{ width: 180, marginTop: 10 }}
              type="number"
              value={accessoriesValue}
              onFocus={() => zeroClearOnFocus(accessoriesValue, setAccessoriesValue, accessoriesMode === "auto")}
              onChange={(e) => setAccessoriesValue(e.target.value)}
              onBlur={() => zeroRestoreOnBlur(accessoriesValue, setAccessoriesValue, accessoriesMode === "auto")}
              disabled={accessoriesMode === "auto"}
              placeholder="e.g. 50000 (Tk)"
            />

            <div className="install-hint" style={{ marginTop: 6 }}>
              শুধু Manual mode এ কাজ করবে।
            </div>
          </div>
        </div>
      </section>

      {/* Installation */}
      <section>
        <h3>Installation Cost</h3>

        <div className="inline" style={{ marginBottom: 10 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={installMode === "auto"} onChange={() => setInstallMode("auto")} />
            <span>Auto</span>
          </label>

          <label className="inline">
            <input className="radio" type="radio" checked={installMode === "manual"} onChange={() => setInstallMode("manual")} />
            <span>Manual</span>
          </label>
        </div>

        <div className="install-row">
          <div className="install-box">
            <div className="install-title">Auto Installation</div>
            <div className="install-hint">Auto mode এ area অনুযায়ী installation cost auto-calculate হবে।</div>
          </div>

          <div className={`install-box manual ${installMode === "auto" ? "is-disabled" : ""}`}>
            <div className="install-title">Manual Override</div>

            <input
              className="input"
              style={{ width: 180, marginTop: 10 }}
              type="number"
              value={installValue}
              onFocus={() => zeroClearOnFocus(installValue, setInstallValue, installMode === "auto")}
              onChange={(e) => setInstallValue(e.target.value)}
              onBlur={() => zeroRestoreOnBlur(installValue, setInstallValue, installMode === "auto")}
              disabled={installMode === "auto"}
              placeholder="e.g. 80000 (Tk)"
            />

            <div className="install-hint" style={{ marginTop: 6 }}></div>
          </div>
        </div>
      </section>

      {/* ✅ VAT option */}
      <section>
        <h3>VAT</h3>

        <div className="inline" style={{ gap: 18 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={!vatEnabled} onChange={() => setVatEnabled(false)} />
            <span>Without VAT</span>
          </label>

          <label className="inline">
            <input className="radio" type="radio" checked={vatEnabled} onChange={() => setVatEnabled(true)} />
            <span>With VAT (10%)</span>
          </label>
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
          VAT enabled হলে সব আইটেমের Unit Price +5% (Tax) হবে, তারপর Total-এর উপর 10% VAT যোগ হবে।
        </div>
      </section>

      {/* ✅ Discount toggle */}
      <section>
        <h3>Discount</h3>

        <div className="inline" style={{ gap: 18 }}>
          <label className="inline">
            <input
              className="radio"
              type="radio"
              checked={!discountEnabled}
              onChange={() => {
                setDiscountEnabled(false);
                setDiscountTk(0);
              }}
            />
            <span>Without Discount</span>
          </label>

          <label className="inline">
            <input className="radio" type="radio" checked={discountEnabled} onChange={() => setDiscountEnabled(true)} />
            <span>With Discount</span>
          </label>
        </div>

        {discountEnabled ? (
          <>
            <div className="form-row" style={{ marginTop: 10 }}>
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
            </div>

            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
              VAT সহ Grand Total থেকে এই Discount বাদ দিয়ে Payable হিসাব হবে।
            </div>
          </>
        ) : null}
      </section>

      {/* ✅ Payment Terms selection */}
      <section>
        <h3>Payment Terms (For T&amp;C)</h3>

        <div className="inline" style={{ gap: 18, flexWrap: "wrap" }}>
          {catalog.paymentTerms.map((p) => (
            <label key={p.id} className="inline" style={{ minWidth: 260 }}>
              <input className="radio" type="radio" checked={paymentTermId === p.id} onChange={() => setPaymentTermId(p.id)} />
              <span>{p.label}</span>
            </label>
          ))}
        </div>

        <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
          Terms &amp; Conditions এর “Payment Terms” সেকশন এই সিলেকশন অনুযায়ী auto update হবে।
        </div>
      </section>

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

      <div className="inline" style={{ marginTop: 6 }}>
        <button type="submit" className="btn btn-primary">
          Calculate
        </button>
      </div>
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

