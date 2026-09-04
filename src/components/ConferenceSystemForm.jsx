import { useEffect, useMemo, useRef, useState } from "react";
import ConferenceComponentCard from "./ConferenceComponentCard.jsx";
import { conferenceBrands as staticConferenceBrands, conferenceProducts as staticConferenceProducts } from "../data/conferenceProducts.js";
import {
  applyConferenceProductToRow,
  buildConferenceCustomRow,
  buildConferenceItemsFromTemplate,
  buildConferenceRow,
  calculateConferenceQuotation,
  cloneConferenceRow,
  findConferenceProductById,
} from "../lib/conferenceCalculationUtils.js";

function TextField({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input className="input" type={type} value={value} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onChange(event.target.value)} />
    </label>
  );
}

export default function ConferenceSystemForm({
  onChange,
  onCalculated,
  products = staticConferenceProducts,
  brands = staticConferenceBrands,
  settings = {},
}) {
  const [systemType, setSystemType] = useState(settings.systemType || "wired");
  const [preferredBrand, setPreferredBrand] = useState(settings.preferredBrand || brands[0] || "Spoon");
  const [customer, setCustomer] = useState({ name: "", position: "", company: "", mobile: "", email: "", address: "" });
  const [projectDetails, setProjectDetails] = useState({
    name: "",
    location: "",
    type: "Conference System Installation",
    preparedBy: "Mugnee Multiple Limited",
  });
  const [vatEnabled, setVatEnabled] = useState(Boolean(settings.vatEnabled));
  const [discountEnabled, setDiscountEnabled] = useState(false);
  const [discountTk, setDiscountTk] = useState(0);
  const [paymentTermId, setPaymentTermId] = useState(settings.paymentTermId || "PT_75_25");
  const [deliveryDays, setDeliveryDays] = useState(settings.deliveryDays ?? settings.defaultDeliveryDays ?? 30);
  const [customWarranty, setCustomWarranty] = useState("");
  const [items, setItems] = useState([]);
  const [newComponentType, setNewComponentType] = useState("");
  const settingDirty = useRef(new Set());
  const productsRef = useRef(products);
  productsRef.current = products;

  useEffect(() => {
    setItems(buildConferenceItemsFromTemplate({ systemType, brand: preferredBrand, products: productsRef.current }));
  }, [systemType, preferredBrand]);

  useEffect(() => {
    const dirty = settingDirty.current;
    if (!dirty.has("systemType") && settings.systemType) setSystemType(settings.systemType);
    if (!dirty.has("preferredBrand") && settings.preferredBrand) setPreferredBrand(settings.preferredBrand);
    if (!dirty.has("vatEnabled") && typeof settings.vatEnabled === "boolean") setVatEnabled(settings.vatEnabled);
    if (!dirty.has("paymentTermId") && settings.paymentTermId) setPaymentTermId(settings.paymentTermId);
    const nextDelivery = settings.deliveryDays ?? settings.defaultDeliveryDays;
    if (!dirty.has("deliveryDays") && nextDelivery !== undefined) setDeliveryDays(nextDelivery);
  }, [settings]);

  useEffect(() => {
    if (brands.includes(preferredBrand)) return;
    setPreferredBrand(brands[0] || "");
  }, [brands, preferredBrand]);

  useEffect(() => {
    setItems((current) => current.map((row) => {
      if (row.selectionMode === "custom") return row;
      const latest = findConferenceProductById(products, row.productId);
      if (!latest) return { ...row, productId: null, brand: "", model: "", unitPrice: row.unitPriceOverridden ? row.unitPrice : 0 };
      const applied = applyConferenceProductToRow(row, latest);
      return {
        ...applied,
        qty: row.qty,
        selectionMode: row.selectionMode,
        unitPrice: row.unitPriceOverridden ? row.unitPrice : applied.unitPrice,
        unitPriceOverridden: Boolean(row.unitPriceOverridden),
      };
    }));
  }, [products]);

  const componentTypes = useMemo(() => {
    const set = new Set();
    products.forEach((product) => {
      if (product.systemType === systemType || product.systemType === "both") set.add(product.componentType);
    });
    return [...set].sort();
  }, [systemType, products]);

  useEffect(() => {
    if (!newComponentType && componentTypes.length) setNewComponentType(componentTypes[0]);
  }, [componentTypes, newComponentType]);

  const selectProductForItem = (id, productId) => {
    setItems((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const product = findConferenceProductById(products, productId);
        return product ? { ...applyConferenceProductToRow(row, product), unitPriceOverridden: false } : row;
      })
    );
  };

  const snapshot = useMemo(
    () => ({
      quotationType: "conference",
      conferenceSystemType: systemType,
      preferredBrand,
      customer,
      projectDetails,
      vatEnabled,
      discountEnabled,
      discountTk: Number(discountTk) || 0,
      paymentTermId,
      deliveryDays: Number(deliveryDays) || 30,
      customWarranty,
      defaultWarrantyYears: Number(settings.defaultWarrantyYears) || 1,
      items,
    }),
    [systemType, preferredBrand, customer, projectDetails, vatEnabled, discountEnabled, discountTk, paymentTermId, deliveryDays, customWarranty, settings.defaultWarrantyYears, items]
  );

  const calcResult = useMemo(() => calculateConferenceQuotation(snapshot), [snapshot]);

  useEffect(() => {
    onChange?.(snapshot);
    onCalculated?.(calcResult, snapshot, { userSubmit: false });
  }, [snapshot, calcResult, onChange, onCalculated]);

  return (
    <>
      <section>
        <h3>Conference System</h3>
        <div className="form-row">
          <label>
            System Type
            <select className="select" value={systemType} onChange={(event) => {
              settingDirty.current.add("systemType");
              setSystemType(event.target.value);
            }}>
              <option value="wired">Wired Conference System</option>
              <option value="wireless">Wireless Conference System</option>
            </select>
          </label>

          <label>
            Preferred Brand
            <select className="select" value={preferredBrand} onChange={(event) => {
              settingDirty.current.add("preferredBrand");
              setPreferredBrand(event.target.value);
            }}>
              {brands.map((brand) => (
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
          <h3>Items</h3>
        </div>
        {items.map((item) => (
          <ConferenceComponentCard
            key={item.id}
            item={item}
            products={products}
            systemType={systemType}
            onSelectProduct={(productId) => selectProductForItem(item.id, productId)}
            onUpdate={(patch) => setItems((prev) => prev.map((row) => (row.id === item.id ? {
              ...row,
              ...patch,
              unitPriceOverridden: "unitPrice" in patch ? true : row.unitPriceOverridden,
            } : row)))}
            onDuplicate={() =>
              setItems((prev) => {
                const index = prev.findIndex((row) => row.id === item.id);
                const next = [...prev];
                next.splice(index + 1, 0, cloneConferenceRow(item));
                return next;
              })
            }
            onRemove={() => setItems((prev) => prev.filter((row) => row.id !== item.id))}
          />
        ))}

        <div className="pa-add-row">
          <select className="select pa-add-select" value={newComponentType} onChange={(event) => setNewComponentType(event.target.value)}>
            {componentTypes.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="btn btn-light"
            onClick={() => setItems((prev) => [...prev, buildConferenceRow({ componentType: newComponentType, qty: 1, products, brand: preferredBrand, systemType })])}
          >
            Add Item
          </button>
          <button type="button" className="btn btn-light" onClick={() => setItems((prev) => [...prev, buildConferenceCustomRow()])}>
            Add Custom Item
          </button>
        </div>
      </section>

      <section>
        <h3>VAT</h3>
        <div className="inline" style={{ gap: 18 }}>
          <label className="inline">
            <input className="radio" type="radio" checked={!vatEnabled} onChange={() => {
              settingDirty.current.add("vatEnabled");
              setVatEnabled(false);
            }} />
            <span>Without VAT</span>
          </label>
          <label className="inline">
            <input className="radio" type="radio" checked={vatEnabled} onChange={() => {
              settingDirty.current.add("vatEnabled");
              setVatEnabled(true);
            }} />
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
        {discountEnabled ? <TextField label="Discount Amount (Tk)" value={discountTk} onChange={setDiscountTk} type="number" /> : null}
      </section>

      <section>
        <h3>Payment &amp; Delivery</h3>
        <div className="form-row">
          <label>
            Payment Terms
            <select className="select" value={paymentTermId} onChange={(event) => {
              settingDirty.current.add("paymentTermId");
              setPaymentTermId(event.target.value);
            }}>
              <option value="PT_75_25">75% Advance / 25% on Arrival</option>
              <option value="PT_50_50">50% Advance / 50% on Arrival</option>
              <option value="PT_100">100% Advance</option>
              <option value="PT_NO_ADV_7D">No Advance / 7 Days After Delivery</option>
            </select>
          </label>
          <TextField label="Delivery (Days)" value={deliveryDays} onChange={(value) => {
            settingDirty.current.add("deliveryDays");
            setDeliveryDays(value);
          }} type="number" />
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
