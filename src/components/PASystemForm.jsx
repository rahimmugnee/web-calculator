import { useEffect, useMemo, useRef, useState } from "react";
import PAComponentCard from "./PAComponentCard.jsx";
import { paProducts, paBrands } from "../data/paProducts.js";
import { paApplicationTypes } from "../data/paApplicationTemplates.js";
import {
  buildItemsFromTemplate,
  applyBrandChange,
  buildManualComponentRow,
  buildCustomItemRow,
  cloneRowWithNewId,
  applyProductToRow,
  resolveBrandDefaultProduct,
  getCandidateProducts,
  findProductById,
  calculatePASystemQuotation,
  resizeAutoRows,
} from "../lib/paCalculationUtils.js";

const supportedComponentTypes = new Set(paProducts.map((product) => product.componentType));

function selectInputValue(event) {
  event.currentTarget.select();
}

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input className="input" type={type} value={value} onFocus={selectInputValue} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function PASystemForm({ onChange, onCalculated }) {
  const [paInstallationType, setPaInstallationType] = useState("wired");
  const [applicationType, setApplicationType] = useState("Office & Corporate Building");
  const [preferredBrand, setPreferredBrand] = useState("CMX");
  const [customer, setCustomer] = useState({ name: "", position: "", company: "", mobile: "", email: "", address: "" });
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    location: "",
    type: "Sound System Installation",
    preparedBy: "Mugnee Multiple Limited",
  });
  const [vatEnabled, setVatEnabled] = useState(false);
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountTk, setDiscountTk] = useState(0);
  const [paymentTermId, setPaymentTermId] = useState("PT_75_25");
  const [deliveryDays, setDeliveryDays] = useState(30);
  const [customWarranty, setCustomWarranty] = useState("");
  const [items, setItems] = useState([]);
  const [newComponentGroup, setNewComponentGroup] = useState("amplifier");

  const preferredBrandRef = useRef(preferredBrand);
  useEffect(() => {
    preferredBrandRef.current = preferredBrand;
  }, [preferredBrand]);

  useEffect(() => {
    setItems(
      buildItemsFromTemplate({
        applicationType,
        installationType: paInstallationType,
        brand: preferredBrandRef.current,
        products: paProducts,
      }).filter((item) => supportedComponentTypes.has(item.componentType))
    );
  }, [applicationType, paInstallationType]);

  const availableComponentTypes = useMemo(() => {
    const set = new Set();
    paProducts.forEach((product) => {
      if (product.installationType === paInstallationType || product.installationType === "both") {
        set.add(product.componentType);
      }
    });
    return [...set].sort();
  }, [paInstallationType]);

  const componentTypeGroups = useMemo(
    () => ({
      amplifier: availableComponentTypes.filter((type) => type.includes("amplifier")),
      speaker: availableComponentTypes.filter((type) => type.includes("speaker")),
      source: availableComponentTypes.filter((type) => !type.includes("amplifier") && !type.includes("speaker")),
    }),
    [availableComponentTypes]
  );

  const componentTypeLabel = (type) => {
    if (type === "wifi-amplifier") return "WiFi Amplifier";
    if (type === "audio-source") return "Audio Sources Player";
    if (type === "wall-speaker") return "Wall Mount Speaker";
    return type.split("-").map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  const groupForComponentType = (type) => {
    if (type.includes("amplifier")) return "amplifier";
    if (type.includes("speaker")) return "speaker";
    return "source";
  };

  const typeOptionsFor = (type) =>
    (componentTypeGroups[groupForComponentType(type)] || []).map((value) => ({ value, label: componentTypeLabel(value) }));

  // Re-runs amplifier/poe-switch auto-sizing against the CURRENT speaker
  // load / PoE endpoint count after every mutation (qty, power tap, model
  // pick, add/remove) so auto rows stay correctly sized as the build changes.
  const mutateItems = (updater) => {
    setItems((prev) => {
      const next = updater(prev);
      return resizeAutoRows(next, { products: paProducts, brand: preferredBrand, installationType: paInstallationType });
    });
  };

  const handleBrandChange = (nextBrand) => {
    setPreferredBrand(nextBrand);
    setItems((prev) => applyBrandChange({ items: prev, products: paProducts, newBrand: nextBrand, installationType: paInstallationType }));
  };

  const updateItem = (id, patch) => {
    mutateItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        // A direct qty edit on an auto-sized PoE switch means the user is
        // taking manual control of the switch count; everything else (qty
        // on speakers/amplifiers, power tap, price) leaves selectionMode as-is.
        const optOutOfAutoSizing = "qty" in patch && row.componentType === "poe-switch";
        return { ...row, ...patch, autoSized: optOutOfAutoSizing ? false : row.autoSized };
      })
    );
  };

  const selectProductForItem = (id, productId) => {
    mutateItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const product = findProductById(paProducts, productId);
        if (!product) return row;
        const applied = applyProductToRow({ ...row, selectionMode: "manual", autoSized: false }, product);
        return { ...applied, warnings: (row.warnings || []).filter((warning) => warning.code !== "MANUAL_PRO_AMP") };
      })
    );
  };

  const selectTypeForItem = (id, componentType) => {
    const product =
      resolveBrandDefaultProduct({ products: paProducts, brand: preferredBrand, installationType: paInstallationType, componentType }) ||
      getCandidateProducts({ products: paProducts, brand: null, installationType: paInstallationType, componentType })[0];
    if (!product) return;
    mutateItems((prev) =>
      prev.map((row) =>
        row.id === id
          ? applyProductToRow({ ...row, componentType, selectionMode: "manual", speakerTapWatts: null }, product)
          : row
      )
    );
  };

  const duplicateItem = (id) => {
    mutateItems((prev) => {
      const index = prev.findIndex((row) => row.id === id);
      if (index === -1) return prev;
      const next = [...prev];
      next.splice(index + 1, 0, cloneRowWithNewId(prev[index]));
      return next;
    });
  };

  const removeItem = (id) => {
    mutateItems((prev) => prev.filter((row) => row.id !== id));
  };

  const addComponent = () => {
    const newComponentType = componentTypeGroups[newComponentGroup]?.[0];
    if (!newComponentType) return;
    const product =
      resolveBrandDefaultProduct({ products: paProducts, brand: preferredBrand, installationType: paInstallationType, componentType: newComponentType }) ||
      getCandidateProducts({ products: paProducts, brand: null, installationType: paInstallationType, componentType: newComponentType })[0] ||
      null;
    mutateItems((prev) => [...prev, buildManualComponentRow({ componentType: newComponentType, productId: product?.id, products: paProducts })]);
  };

  const addCustomItem = () => {
    mutateItems((prev) => [...prev, buildCustomItemRow({ name: "Custom Item" })]);
  };

  const snapshot = useMemo(
    () => ({
      quotationType: "pa",
      paInstallationType,
      applicationType,
      preferredBrand,
      customer,
      projectDetails,
      vatEnabled,
      discountEnabled,
      discountTk: Number(discountTk) || 0,
      paymentTermId,
      deliveryDays: Number(deliveryDays) || 30,
      customWarranty,
      defaultWarrantyYears: 1,
      items,
    }),
    [
      paInstallationType,
      applicationType,
      preferredBrand,
      customer,
      projectDetails,
      vatEnabled,
      discountEnabled,
      discountTk,
      paymentTermId,
      deliveryDays,
      customWarranty,
      items,
    ]
  );

  const calcResult = useMemo(() => calculatePASystemQuotation(snapshot, paProducts), [snapshot]);

  useEffect(() => {
    onChange?.(snapshot);
    onCalculated?.(calcResult, snapshot, { userSubmit: false });
  }, [snapshot, calcResult, onChange, onCalculated]);

  return (
    <>
      <section>
        <h3>PA System</h3>
        <div className="form-row">
          <label>
            Installation Type
            <select className="select" value={paInstallationType} onChange={(event) => setPaInstallationType(event.target.value)}>
              <option value="wired">Wired PA System</option>
              <option value="ip">IP-Based PA System</option>
            </select>
          </label>

          <label>
            Application Type
            <select className="select" value={applicationType} onChange={(event) => setApplicationType(event.target.value)}>
              {paApplicationTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </label>

          <label>
            Preferred Brand
            <select className="select" value={preferredBrand} onChange={(event) => handleBrandChange(event.target.value)}>
              {paBrands.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      <section>
        <div className="section-title-row">
          <h3>Components</h3>
        </div>

        {items.length === 0 ? (
          <div className="brand-sub">No components yet. Use Add Component or Add Custom Item below.</div>
        ) : (
          items.map((item) => (
            <PAComponentCard
              key={item.id}
              item={item}
              products={paProducts}
              installationType={paInstallationType}
              warnings={calcResult.rowWarnings?.[item.id] || []}
              componentTypeOptions={typeOptionsFor(item.componentType)}
              onSelectType={(componentType) => selectTypeForItem(item.id, componentType)}
              onSelectProduct={(productId) => selectProductForItem(item.id, productId)}
              onUpdate={(patch) => updateItem(item.id, patch)}
              onDuplicate={() => duplicateItem(item.id)}
              onRemove={() => removeItem(item.id)}
            />
          ))
        )}

        {calcResult.systemWarnings?.length ? (
          <div className="pa-system-warnings">
            {calcResult.systemWarnings.map((warning, index) => (
              <div key={`system-warn-${index}`} className="pa-card-warning">
                {warning.message}
              </div>
            ))}
          </div>
        ) : null}

        <div className="pa-add-row">
          <select className="select pa-add-select" value={newComponentGroup} onChange={(event) => setNewComponentGroup(event.target.value)}>
            <option value="amplifier">Amplifier</option>
            <option value="speaker">Speaker</option>
            <option value="source">Audio Source</option>
          </select>
          <button type="button" className="btn btn-light" onClick={addComponent}>
            Add Component
          </button>
          <button type="button" className="btn btn-light" onClick={addCustomItem}>
            Add Custom Item
          </button>
        </div>
      </section>

      <section>
        <h3>VAT</h3>
        <div className="inline" style={{ gap: 18 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={!vatEnabled} onChange={() => setVatEnabled(false)} />
            <span>Without VAT</span>
          </label>
          <label className="inline">
            <input className="radio" type="radio" checked={vatEnabled} onChange={() => setVatEnabled(true)} />
            <span>With VAT (15%)</span>
          </label>
        </div>
      </section>

      <section>
        <h3>Discount</h3>
        <div className="inline" style={{ gap: 18, marginBottom: 12 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={!discountEnabled} onChange={() => setDiscountEnabled(false)} />
            <span>No Discount</span>
          </label>
          <label className="inline">
            <input className="radio" type="radio" checked={discountEnabled} onChange={() => setDiscountEnabled(true)} />
            <span>Special Discount</span>
          </label>
        </div>
        {discountEnabled ? (
          <div className="form-row">
            <TextField label="Discount Amount (Tk)" value={discountTk} onChange={setDiscountTk} type="number" />
          </div>
        ) : null}
      </section>

      <section>
        <h3>Payment &amp; Delivery</h3>
        <div className="form-row">
          <label>
            Payment Terms
            <select className="select" value={paymentTermId} onChange={(event) => setPaymentTermId(event.target.value)}>
              <option value="PT_75_25">75% Advance / 25% on Arrival</option>
              <option value="PT_50_50">50% Advance / 50% on Arrival</option>
              <option value="PT_100">100% Advance</option>
              <option value="PT_NO_ADV_7D">No Advance / 7 Days After Delivery</option>
            </select>
          </label>
          <TextField label="Delivery (Days)" value={deliveryDays} onChange={setDeliveryDays} type="number" />
          <TextField label="Custom Warranty (Years)" value={customWarranty} onChange={setCustomWarranty} type="number" />
        </div>
      </section>

      <section>
        <h3>Client's Information</h3>
        <div className="form-row">
          <TextField label="Client Name" value={customer.name} onChange={(value) => setCustomer((prev) => ({ ...prev, name: value }))} />
          <TextField label="Designation" value={customer.position} onChange={(value) => setCustomer((prev) => ({ ...prev, position: value }))} />
          <TextField label="Organization Name" value={customer.company} onChange={(value) => setCustomer((prev) => ({ ...prev, company: value }))} />
          <TextField label="Mobile Number" value={customer.mobile} onChange={(value) => setCustomer((prev) => ({ ...prev, mobile: value }))} />
          <TextField label="Email Address" value={customer.email} onChange={(value) => setCustomer((prev) => ({ ...prev, email: value }))} />
          <TextField label="Address" value={customer.address} onChange={(value) => setCustomer((prev) => ({ ...prev, address: value }))} />
        </div>
      </section>

      <section>
        <h3>Project Details</h3>
        <div className="form-row">
          <TextField label="Project Name" value={projectDetails.name} onChange={(value) => setProjectDetails((prev) => ({ ...prev, name: value }))} />
          <TextField label="Project Location" value={projectDetails.location} onChange={(value) => setProjectDetails((prev) => ({ ...prev, location: value }))} />
          <TextField label="Project Type" value={projectDetails.type} onChange={(value) => setProjectDetails((prev) => ({ ...prev, type: value }))} />
          <TextField label="Prepared By" value={projectDetails.preparedBy} onChange={(value) => setProjectDetails((prev) => ({ ...prev, preparedBy: value }))} />
        </div>
      </section>
    </>
  );
}
