// src/components/DisplaySize.jsx
import React, { useState } from "react";

const WIDTHS = [
  3.15, 4.2, 5.25, 6.3, 7.35, 8.4, 9.45, 10.5, 11.55, 12.6,
  13.65, 14.7, 15.75, 16.8, 17.85, 18.9, 19.95, 21, 22.05,
  23.1, 24.15, 25.2
];

const HEIGHTS = [
  1.05, 1.58, 2.1, 2.63, 3.15, 3.68, 4.2, 4.73, 5.25, 5.8,
  6.3, 6.83, 7.35, 7.9, 8.4, 8.93, 9.45, 10, 10.5, 11.02,
  11.55, 12.07, 12.6, 13.12, 13.65
];

const P3P6 = [
  3.15, 4.41, 5.04, 5.67, 6.3, 6.93, 7.56, 7.78, 8.19, 8.82,
  9.55, 10.08, 10.71, 11.34, 11.97, 12.6, 13.23, 14.5,
  15.12, 15.75
];

// Cabinet based sizes (640 x 480 mm)
const CABINET_WIDTHS = [2.1, 4.2, 6.3, 8.4, 10.5, 12.6, 14.7, 16.8, 18.9, 21];
const CABINET_HEIGHTS = [1.58, 3.15, 4.73, 6.3, 7.9, 9.45, 11.02, 12.6, 14.18];

function Chip({ value, active, onClick }) {
  return (
    <button
      type="button"
      className={`ds-chip ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {value}
    </button>
  );
}

export default function DisplaySize({ onPick }) {
  const [activeRow, setActiveRow] = useState("");
  const [activeValue, setActiveValue] = useState(null);

  const handlePick = (row, val) => {
    setActiveRow(row);
    setActiveValue(val);
    if (typeof onPick === "function") onPick(row, val);
  };

  return (
    <section className="ds-wrap">
      <div className="ds-card">
        <div className="ds-title">Display Size</div>

        <div className="ds-grid">
          {/* Normal Width */}
          <div className="ds-label">Width</div>
          <div className="ds-line">
            {WIDTHS.map(v => (
              <Chip
                key={`w-${v}`}
                value={v}
                active={activeRow === "width" && activeValue === v}
                onClick={() => handlePick("width", v)}
              />
            ))}
          </div>

          {/* Normal Height */}
          <div className="ds-label">Height</div>
          <div className="ds-line">
            {HEIGHTS.map(v => (
              <Chip
                key={`h-${v}`}
                value={v}
                active={activeRow === "height" && activeValue === v}
                onClick={() => handlePick("height", v)}
              />
            ))}
          </div>

          {/* Cabinet Width */}
          <div className="ds-label cabinet-label">Cabinet Width (640mm)</div>
          <div className="ds-line cabinet-line">
            {CABINET_WIDTHS.map(v => (
              <Chip
                key={`cw-${v}`}
                value={v}
                active={activeRow === "cabinetWidth" && activeValue === v}
                onClick={() => handlePick("cabinetWidth", v)}
              />
            ))}
          </div>

          {/* Cabinet Height */}
          <div className="ds-label cabinet-label">Cabinet Height (480mm)</div>
          <div className="ds-line cabinet-line">
            {CABINET_HEIGHTS.map(v => (
              <Chip
                key={`ch-${v}`}
                value={v}
                active={activeRow === "cabinetHeight" && activeValue === v}
                onClick={() => handlePick("cabinetHeight", v)}
              />
            ))}
          </div>

          {/* P3 / P6 */}
          <div className="ds-label">P3 / P6</div>
          <div className="ds-line">
            {P3P6.map(v => (
              <Chip
                key={`p-${v}`}
                value={v}
                active={activeRow === "p3p6" && activeValue === v}
                onClick={() => handlePick("p3p6", v)}
              />
            ))}
          </div>
        </div>

        <div className="ds-hint">
          Cabinet size calculated based on 640×480 mm (approx ft).
        </div>
      </div>
    </section>
  );
}