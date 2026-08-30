import { useMemo, useState } from "react";
import SearchableSelect from "./common/SearchableSelect.jsx";
import { getCandidateProducts, componentTypeLabel } from "../lib/paCalculationUtils.js";
import { toBDT } from "../lib/calc.js";

export default function PAComponentCard({
  item,
  products,
  installationType,
  warnings = [],
  componentTypeOptions = [],
  onSelectType,
  onSelectProduct,
  onUpdate,
  onDuplicate,
  onRemove,
}) {
  const [replaceSignal, setReplaceSignal] = useState(0);

  const allBrandCandidates = useMemo(
    () => getCandidateProducts({ products, brand: null, installationType, componentType: item.componentType }),
    [products, installationType, item.componentType]
  );

  const brandOptions = useMemo(() => {
    const seen = new Set();
    const options = [];
    allBrandCandidates.forEach((product) => {
      if (seen.has(product.brand)) return;
      seen.add(product.brand);
      options.push(product.brand);
    });
    return options;
  }, [allBrandCandidates]);

  const activeBrand = item.brand || brandOptions[0] || "";

  const modelOptions = useMemo(
    () =>
      allBrandCandidates
        .filter((product) => product.brand === activeBrand)
        .map((product) => ({ value: product.id, label: `${product.productName} — ${product.model}` })),
    [allBrandCandidates, activeBrand]
  );

  const handleBrandChange = (event) => {
    const newBrand = event.target.value;
    const first = allBrandCandidates.find((product) => product.brand === newBrand);
    if (first) onSelectProduct(first.id);
  };

  const handleQtyStep = (delta) => {
    const next = Math.max(1, Math.round((Number(item.qty) || 0) + delta));
    onUpdate({ qty: next });
  };

  const lineTotal = Math.max(0, Number(item.qty) || 0) * Math.max(0, Number(item.unitPrice) || 0);
  const isCustom = item.selectionMode === "custom";

  return (
    <div className="pa-component-card">
      <div className="pa-card-heading">{isCustom ? "Custom Item" : componentTypeLabel(item.componentType)}</div>

      <div className="pa-component-card-grid">
        {!isCustom ? (
          <label>
            Type
            <select className="select" value={item.componentType} onChange={(event) => onSelectType(event.target.value)}>
              {componentTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        {isCustom ? (
          <label>
            Component Name
            <input
              className="input"
              type="text"
              value={item.productName}
              onChange={(event) => onUpdate({ productName: event.target.value })}
            />
          </label>
        ) : (
          <label>
            Model
            <SearchableSelect
              value={item.productId}
              options={modelOptions}
              onChange={onSelectProduct}
              placeholder="Select model..."
              ariaLabel="Model"
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
        {Array.isArray(item.speakerTapOptions) && item.speakerTapOptions.length ? (
          <span>
            Power Tap:{" "}
            <select
              className="select pa-tap-select"
              value={item.speakerTapWatts ?? ""}
              onChange={(event) => onUpdate({ speakerTapWatts: Number(event.target.value) })}
            >
              {item.speakerTapOptions.map((watt) => (
                <option key={watt} value={watt}>
                  {watt}W
                </option>
              ))}
            </select>
          </span>
        ) : null}
        <span>Line Total: {toBDT(lineTotal)}</span>
      </div>

      {warnings.length ? (
        <div className="pa-card-warnings">
          {warnings.map((warning, index) => (
            <div key={`${item.id}-warn-${index}`} className={`pa-card-warning${warning.severity === "error" ? " error" : ""}`}>
              {warning.message}
              {Array.isArray(warning.actions) && warning.actions.length ? (
                <span className="pa-card-warning-actions"> ({warning.actions.join(" / ")})</span>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

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
