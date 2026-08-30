import { useMemo, useState } from "react";
import SearchableSelect from "./common/SearchableSelect.jsx";
import { toBDT } from "../lib/calc.js";
import { conferenceComponentTypeLabel, getConferenceCandidateProducts } from "../lib/conferenceCalculationUtils.js";

export default function ConferenceComponentCard({
  item,
  products,
  systemType,
  onSelectProduct,
  onUpdate,
  onDuplicate,
  onRemove,
}) {
  const [replaceSignal, setReplaceSignal] = useState(0);
  const candidates = useMemo(
    () => getConferenceCandidateProducts({ products, brand: null, systemType, componentType: item.componentType }),
    [products, systemType, item.componentType]
  );
  const brandOptions = useMemo(() => [...new Set(candidates.map((product) => product.brand))], [candidates]);
  const activeBrand = item.brand || brandOptions[0] || "";
  const modelOptions = useMemo(
    () =>
      candidates
        .filter((product) => product.brand === activeBrand)
        .map((product) => ({ value: product.id, label: `${product.productName} - ${product.model}` })),
    [candidates, activeBrand]
  );
  const isCustom = item.selectionMode === "custom";
  const lineTotal = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.unitPrice) || 0);

  const handleBrandChange = (event) => {
    const product = candidates.find((candidate) => candidate.brand === event.target.value);
    if (product) onSelectProduct(product.id);
  };

  const handleQtyStep = (delta) => {
    onUpdate({ qty: Math.max(1, Math.round((Number(item.qty) || 0) + delta)) });
  };

  return (
    <div className="pa-component-card">
      <div className="pa-card-heading">{isCustom ? "Custom Item" : conferenceComponentTypeLabel(item.componentType)}</div>

      <div className="pa-component-card-grid">
        {isCustom ? (
          <label>
            Item Name
            <input className="input" type="text" value={item.productName} onChange={(event) => onUpdate({ productName: event.target.value })} />
          </label>
        ) : (
          <label>
            Item / Model
            <SearchableSelect
              value={item.productId}
              options={modelOptions}
              onChange={onSelectProduct}
              placeholder="Select model..."
              ariaLabel="Item / Model"
              openSignal={replaceSignal}
            />
          </label>
        )}

        {isCustom ? (
          <label>
            Brand
            <input className="input" type="text" value={item.brand} onChange={(event) => onUpdate({ brand: event.target.value })} />
          </label>
        ) : (
          <label>
            Brand
            <select className="select" value={activeBrand} onChange={handleBrandChange} disabled={brandOptions.length <= 1}>
              {brandOptions.map((brand) => (
                <option key={brand} value={brand}>
                  {brand}
                </option>
              ))}
            </select>
          </label>
        )}

        <label>
          Quantity
          <div className="pa-qty-stepper">
            <button type="button" className="btn btn-light" onClick={() => handleQtyStep(-1)}>
              -
            </button>
            <input
              className="input"
              type="number"
              min="1"
              value={item.qty}
              onChange={(event) => onUpdate({ qty: Math.max(1, Number(event.target.value) || 1) })}
            />
            <button type="button" className="btn btn-light" onClick={() => handleQtyStep(1)}>
              +
            </button>
          </div>
        </label>

        <label>
          Unit Price (Tk)
          <input
            className="input"
            type="number"
            min="0"
            value={item.unitPrice}
            onChange={(event) => onUpdate({ unitPrice: Math.max(0, Number(event.target.value) || 0) })}
          />
        </label>
      </div>

      <div className="pa-card-subrow">
        <span>Unit: {item.unit || "-"}</span>
        <span>Model: {item.model || "-"}</span>
        <span>Line Total: {toBDT(lineTotal)}</span>
      </div>

      <div className="pa-card-actions">
        {isCustom ? null : (
          <button type="button" className="btn btn-light" onClick={() => setReplaceSignal((n) => n + 1)}>
            Replace
          </button>
        )}
        <button type="button" className="btn btn-light" onClick={onDuplicate}>
          Duplicate
        </button>
        <button type="button" className="btn btn-light" onClick={onRemove}>
          Remove
        </button>
      </div>
    </div>
  );
}
