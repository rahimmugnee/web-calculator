// src/components/DisplaySize.jsx
import React from "react";

function roundSize(value) {
  return Number(value.toFixed(2));
}

function buildStepSeries(step, max) {
  const values = [];
  for (let current = step; current <= max + 0.001; current += step) {
    values.push(roundSize(current));
  }
  return values;
}

const WIDTHS = buildStepSeries(1.05, 45.15);
const HEIGHTS = buildStepSeries(0.525, 25.2);

const P3P6 = [
  3.15, 4.41, 5.04, 5.67, 6.3, 6.93, 7.56, 7.78, 8.19, 8.82,
  9.55, 10.08, 10.71, 11.34, 11.97, 12.6, 13.23, 14.5,
  15.12, 15.75
];

const CABINET_SIZE_ROWS = [
  { row: "cabinetWidth", label: "Cabinet Width (640mm)", values: buildStepSeries(2.1, 40) },
  { row: "cabinetHeight", label: "Cabinet Height (480mm)", values: buildStepSeries(1.575, 25.2) },
  { row: "cabinetHeight640", label: "Cabinet Height (640mm)", values: buildStepSeries(2.1, 25.2) },
  { row: "cabinetWidth960", label: "Cabinet Width (960mm)", values: buildStepSeries(3.15, 41) },
  { row: "cabinetHeight960", label: "Cabinet Height (960mm)", values: buildStepSeries(3.15, 25.2) },
  { row: "cabinetWidth1280", label: "Cabinet Width (1280mm)", values: buildStepSeries(4.2, 42) },
  { row: "cabinetHeight1280", label: "Cabinet Height (1280mm)", values: buildStepSeries(4.2, 25.2) },
];

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

export default function DisplaySize({ onPick, activeChips = {} }) {
  const handlePick = (row, val) => {
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
                active={activeChips.width === v}
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
                active={activeChips.height === v}
                onClick={() => handlePick("height", v)}
              />
            ))}
          </div>

          {CABINET_SIZE_ROWS.map((cabinetRow) => (
            <React.Fragment key={cabinetRow.row}>
              <div className="ds-label cabinet-label">{cabinetRow.label}</div>
              <div className="ds-line cabinet-line">
                {cabinetRow.values.map(v => (
                  <Chip
                    key={`${cabinetRow.row}-${v}`}
                    value={v}
                    active={activeChips[cabinetRow.row] === v}
                    onClick={() => handlePick(cabinetRow.row, v)}
                  />
                ))}
              </div>
            </React.Fragment>
          ))}

          {/* P3 / P6 */}
          <div className="ds-label">P3 / P6</div>
          <div className="ds-line">
            {P3P6.map(v => (
              <Chip
                key={`p-${v}`}
                value={v}
                active={activeChips.p3p6 === v}
                onClick={() => handlePick("p3p6", v)}
              />
            ))}
          </div>
        </div>

        <div className="ds-hint">
          Size calculated based on cabinet sizes 640x480 mm, 640x640 mm, 960x960 mm, and 1280x1280 mm (approx ft).
        </div>
      </div>
    </section>
  );
}
