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

const RENTAL_CABINET_FT = 1.64;
const RENTAL_WIDTHS = buildStepSeries(RENTAL_CABINET_FT, 34.44);
const RENTAL_HEIGHTS = buildStepSeries(RENTAL_CABINET_FT, 26.24);

function findClosest(values, target) {
  return values.reduce((closest, value) => (Math.abs(value - target) < Math.abs(closest - target) ? value : closest), values[0]);
}

function buildRatioActive(row, value) {
  if (row === "rentalWidth") {
    return {
      rentalWidth: value,
      rentalHeight: findClosest(RENTAL_HEIGHTS, (value * 9) / 16),
    };
  }

  return {
    rentalHeight: value,
    rentalWidth: findClosest(RENTAL_WIDTHS, (value * 16) / 9),
  };
}

function getCabinetQty(activeChips) {
  const width = Number(activeChips?.rentalWidth);
  const height = Number(activeChips?.rentalHeight);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "-";

  const columns = Math.max(1, Math.round(width / RENTAL_CABINET_FT));
  const rows = Math.max(1, Math.round(height / RENTAL_CABINET_FT));
  return columns * rows;
}

function Chip({ value, active, onClick }) {
  return (
    <button type="button" className={`ds-chip ${active ? "active" : ""}`} onClick={onClick}>
      {value}
    </button>
  );
}

export default function RentalDisplaySize({ onPick, activeChips = {} }) {
  const cabinetQty = getCabinetQty(activeChips);

  const handlePick = (row, value) => {
    if (typeof onPick === "function") onPick(row, value, buildRatioActive(row, value));
  };

  return (
    <section className="ds-wrap rental-ds-wrap">
      <div className="ds-card">
        <div className="ds-title-row">
          <div aria-hidden="true" />
          <div className="ds-title">Rental Display Size</div>
          <div className="rental-cabinet-qty">
            <span>Cabinet Qty</span>
            <b>:</b>
            <strong>{cabinetQty}</strong>
          </div>
        </div>

        <div className="ds-grid">
          <div className="ds-label">Rental Width</div>
          <div className="ds-line">
            {RENTAL_WIDTHS.map((value) => (
              <Chip
                key={`rental-width-${value}`}
                value={value}
                active={activeChips.rentalWidth === value}
                onClick={() => handlePick("rentalWidth", value)}
              />
            ))}
          </div>

          <div className="ds-label">Rental Height</div>
          <div className="ds-line">
            {RENTAL_HEIGHTS.map((value) => (
              <Chip
                key={`rental-height-${value}`}
                value={value}
                active={activeChips.rentalHeight === value}
                onClick={() => handlePick("rentalHeight", value)}
              />
            ))}
          </div>
        </div>

        <div className="ds-hint">Rental cabinet size: 1.64 ft x 1.64 ft.</div>
      </div>
    </section>
  );
}
