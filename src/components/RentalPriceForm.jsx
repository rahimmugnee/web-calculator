import { useEffect, useMemo, useRef, useState } from "react";
import { calculateRentalQuotation } from "../lib/rentalCalc.js";

function toNumber(value) {
  return Number(value) || 0;
}

function numberOrDefault(value, fallback) {
  if (value === "" || value === null || typeof value === "undefined") return fallback;
  return Number(value) || 0;
}

function formatArea(widthFt, heightFt) {
  const width = parseFloat(widthFt);
  const height = parseFloat(heightFt);
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) return "";
  return (width * height).toFixed(2);
}

function formatPairedArea(widthFt, heightFt, pairs) {
  const area = toNumber(formatArea(widthFt, heightFt));
  if (!area) return "";
  return (area * Math.max(1, toNumber(pairs) || 1)).toFixed(2);
}

function zeroClearOnFocus(value, setter) {
  if (String(value) === "0") setter("");
}

function zeroRestoreOnBlur(value, setter) {
  if (value === "" || value === null || typeof value === "undefined") setter(0);
}

function selectInputValue(event) {
  event.currentTarget.select();
}

function keepSelectedValue(event) {
  event.preventDefault();
}

function createDisplaySize(id) {
  return { id, widthFt: 0, heightFt: 0, pairs: "" };
}

function formatDisplayMeasure(value) {
  const num = Number(value);
  if (!Number.isFinite(num)) return "-";
  return String(Number(num.toFixed(2)));
}

function formatSftLabel(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num <= 0) return "";
  return `${String(Number(num.toFixed(2)))} Sft.`;
}

function MoneyField({ label, value, onChange, placeholder = "0", restoreEmptyToZero = true }) {
  return (
    <label>
      {label}
      <input
        className="input"
        type="number"
        min="0"
        step="any"
        value={value}
        onFocus={(event) => {
          if (String(value) === "0") {
            zeroClearOnFocus(value, onChange);
            return;
          }
          selectInputValue(event);
        }}
        onMouseUp={keepSelectedValue}
        onChange={(event) => onChange(event.target.value)}
        onBlur={() => {
          if (restoreEmptyToZero) zeroRestoreOnBlur(value, onChange);
        }}
        placeholder={placeholder}
      />
    </label>
  );
}

function TextField({ label, value, onChange, type = "text", placeholder = "", clearZeroOnFocus = false }) {
  return (
    <label>
      {label}
      <input
        className="input"
        type={type}
        step={type === "number" ? "any" : undefined}
        value={value}
        onFocus={(event) => {
          if (clearZeroOnFocus && String(value) === "0") {
            onChange("");
            return;
          }
          selectInputValue(event);
        }}
        onMouseUp={keepSelectedValue}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          if (clearZeroOnFocus && event.currentTarget.value === "") onChange(0);
        }}
        placeholder={placeholder}
      />
    </label>
  );
}

function QuantityField({ label, value, onChange }) {
  return (
    <label>
      {label}
      <input
        className="input"
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={value}
        onFocus={selectInputValue}
        onMouseUp={keepSelectedValue}
        onChange={(event) => onChange(event.target.value)}
        onBlur={(event) => {
          if (event.currentTarget.value === "") onChange(1);
        }}
        placeholder="1"
      />
    </label>
  );
}

export default function RentalPriceForm({ onChange, onCalculated, sizePick, onSizeSelectionChange, settings = {} }) {
  const [client, setClient] = useState({
    company: "",
    attention: "",
    designation: "",
    projectEvent: "",
    venue: "",
    eventDate: "",
    mobile: "",
    address: "",
  });
  const [displaySizes, setDisplaySizes] = useState(() => [createDisplaySize(1)]);
  const [activeDisplaySizeId, setActiveDisplaySizeId] = useState(1);
  const [sftRate, setSftRate] = useState(settings.sftRate ?? 150);
  const [structureRate, setStructureRate] = useState(settings.structureRate ?? "");
  const [soundPairs, setSoundPairs] = useState(settings.soundPairs ?? "");
  const [soundRate, setSoundRate] = useState(settings.soundRate ?? 0);
  const [duration, setDuration] = useState(settings.duration ?? 1);
  const [transportValue, setTransportValue] = useState(settings.transportValue ?? 0);
  const [includedQty, setIncludedQty] = useState({
    mixer: settings.includedQty?.mixer ?? 1,
    processor: settings.includedQty?.processor ?? 1,
    wirelessMic: settings.includedQty?.wirelessMic ?? 1,
    wiredMic: settings.includedQty?.wiredMic ?? 1,
    laptop: settings.includedQty?.laptop ?? 1,
    technicalPerson: settings.includedQty?.technicalPerson ?? 1,
  });
  const [vatEnabled, setVatEnabled] = useState(Boolean(settings.vatEnabled));
  const settingDirty = useRef(new Set());

  useEffect(() => {
    const dirty = settingDirty.current;
    if (!dirty.has("sftRate") && settings.sftRate !== undefined) setSftRate(settings.sftRate);
    if (!dirty.has("structureRate") && settings.structureRate !== undefined) setStructureRate(settings.structureRate);
    if (!dirty.has("soundPairs") && settings.soundPairs !== undefined) setSoundPairs(settings.soundPairs);
    if (!dirty.has("soundRate") && settings.soundRate !== undefined) setSoundRate(settings.soundRate);
    if (!dirty.has("duration") && settings.duration !== undefined) setDuration(settings.duration);
    if (!dirty.has("transportValue") && settings.transportValue !== undefined) setTransportValue(settings.transportValue);
    if (!dirty.has("vatEnabled") && typeof settings.vatEnabled === "boolean") setVatEnabled(settings.vatEnabled);
    setIncludedQty((current) => {
      const next = { ...current };
      let changed = false;
      for (const key of ["mixer", "processor", "wirelessMic", "wiredMic", "laptop", "technicalPerson"]) {
        if (dirty.has(`includedQty.${key}`) || settings.includedQty?.[key] === undefined) continue;
        if (next[key] !== settings.includedQty[key]) {
          next[key] = settings.includedQty[key];
          changed = true;
        }
      }
      return changed ? next : current;
    });
  }, [settings]);

  const displaySizeRows = useMemo(
    () =>
      displaySizes.map((size) => ({
        ...size,
        pairQty: Math.max(1, toNumber(size.pairs) || 1),
        sft: formatPairedArea(size.widthFt, size.heightFt, size.pairs),
      })),
    [displaySizes]
  );

  const totalSft = useMemo(
    () => displaySizeRows.reduce((sum, size) => sum + toNumber(size.sft), 0),
    [displaySizeRows]
  );

  const display = useMemo(
    () => ({
      widthFt: displaySizeRows[0]?.widthFt || "",
      heightFt: displaySizeRows[0]?.heightFt || "",
      sft: totalSft ? totalSft.toFixed(2) : "",
      sizes: displaySizeRows,
    }),
    [displaySizeRows, totalSft]
  );

  const updateDisplaySize = (id, field, value) => {
    setActiveDisplaySizeId(id);
    setDisplaySizes((prev) => prev.map((size) => (size.id === id ? { ...size, [field]: value } : size)));
  };

  const addDisplaySize = () => {
    setDisplaySizes((prev) => {
      const nextId = Math.max(0, ...prev.map((size) => size.id)) + 1;
      setActiveDisplaySizeId(nextId);
      return [...prev, createDisplaySize(nextId)];
    });
  };

  const removeDisplaySize = (id) => {
    setDisplaySizes((prev) => {
      if (prev.length <= 1) return prev;
      const next = prev.filter((size) => size.id !== id);
      setActiveDisplaySizeId((current) => (current === id ? next[0].id : current));
      return next;
    });
  };

  useEffect(() => {
    if (!sizePick) return;

    if (sizePick.row === "rentalWidth") {
      updateDisplaySize(activeDisplaySizeId, "widthFt", String(sizePick.width));
      onSizeSelectionChange?.((prev) => ({ ...(prev || {}), rentalWidth: sizePick.width }));
      return;
    }

    if (sizePick.row === "rentalHeight") {
      updateDisplaySize(activeDisplaySizeId, "heightFt", String(sizePick.height));
      onSizeSelectionChange?.((prev) => ({ ...(prev || {}), rentalHeight: sizePick.height }));
    }
  }, [sizePick, activeDisplaySizeId, onSizeSelectionChange]);

	  const snapshot = useMemo(() => {
	    const area = totalSft;
	    const displayRate = area * toNumber(sftRate);
	    const structureDisplayRate = numberOrDefault(structureRate, 3000);
	    const getIncludedQty = (key) => Math.max(1, Math.ceil(numberOrDefault(includedQty[key], 1)));
	    const sizeLines = displaySizeRows
      .filter((size) => toNumber(size.widthFt) > 0 || toNumber(size.heightFt) > 0)
      .map((size, index) => {
        const pairPart = size.pairQty > 1 ? ` - ${size.pairQty} sets` : "";
        return `Display ${index + 1}: ${formatDisplayMeasure(size.widthFt)} ft (W) x ${formatDisplayMeasure(size.heightFt)} ft (H)${pairPart}`;
      });

    return {
      quotationType: "rental",
      customer: {
        name: client.attention,
        position: client.designation,
        company: client.company,
        mobile: client.mobile,
        address: client.address,
        projectEvent: client.projectEvent,
        venue: client.venue,
        eventDate: client.eventDate,
      },
      display,
      duration: Math.max(1, toNumber(duration) || 1),
      vatEnabled,
      model: {
        name: "Rental LED Display",
      },
      items: [
	        {
	          name: `P3 Rental LED Display${area > 0 ? ` ${formatSftLabel(area)}` : ""}`,
	          detailLines: sizeLines.length ? sizeLines : ["Size: - ft (W) x - ft (H)"],
	          qty: 1,
          unit: "Set",
          rate: displayRate,
          className: "rental-display-row",
        },
	        {
	          name: "LED Display Structure",
	          detail: "MS Truss Structure",
	          qty: 1,
          unit: "Set",
          rate: structureDisplayRate,
        },
        {
          name: "Professional Sound System",
          qty: Math.max(1, numberOrDefault(soundPairs, 1)),
          unit: "Pair",
          rate: soundRate,
        },
	        { name: "Digital Audio Mixer", qty: getIncludedQty("mixer"), unit: "Pc", included: true },
	        {
	          name: "Audio Processor",
	          qty: getIncludedQty("processor"),
	          unit: "Pc",
	          included: true,
	        },
	        {
	          name: "Wireless Microphone",
	          qty: getIncludedQty("wirelessMic"),
	          unit: "Pcs",
	          included: true,
	        },
	        {
	          name: "Wired Microphone",
	          qty: getIncludedQty("wiredMic"),
	          unit: "Pc",
	          included: true,
	        },
	        {
	          name: "Laptop (Display Control)",
	          qty: getIncludedQty("laptop"),
	          unit: "Pc",
	          included: true,
	        },
	        {
	          name: "Technical Person",
	          qty: getIncludedQty("technicalPerson"),
	          unit: "Persons",
	          included: true,
        },
	        {
	          name: "Transport (Round Trip)",
	          qty: 2,
	          unit: "Trip",
	          rate: transportValue,
          duration: "fixed-1",
        },
      ],
    };
  }, [
    client,
    display,
    displaySizeRows,
    totalSft,
    duration,
    sftRate,
    structureRate,
	    soundPairs,
	    soundRate,
	    transportValue,
	    includedQty,
	    vatEnabled,
	  ]);

  useEffect(() => {
    const result = calculateRentalQuotation(snapshot);
    onChange?.(snapshot);
    onCalculated?.(result, snapshot, { userSubmit: false });
  }, [snapshot, onChange, onCalculated]);

  return (
    <>
      <section>
        <div className="section-title-row">
          <h3>Rental Display Size</h3>
          <button className="btn btn-light rental-add-size" type="button" onClick={addDisplaySize}>
            Add More Size
          </button>
        </div>

        {displaySizeRows.map((size, index) => (
          <div
            key={size.id}
            className={`rental-size-entry${activeDisplaySizeId === size.id ? " active" : ""}`}
            onFocus={() => setActiveDisplaySizeId(size.id)}
          >
            <div className="form-row rental-size-fields">
              <TextField
                label={`Width (ft)${index > 0 ? ` ${index + 1}` : ""}`}
                value={size.widthFt}
                onChange={(value) => {
                  updateDisplaySize(size.id, "widthFt", value);
                  onSizeSelectionChange?.((prev) => {
                    const next = { ...(prev || {}) };
                    delete next.rentalWidth;
                    return next;
                  });
                }}
                type="number"
                placeholder="0"
                clearZeroOnFocus
              />
              <TextField
                label={`Height (ft)${index > 0 ? ` ${index + 1}` : ""}`}
                value={size.heightFt}
                onChange={(value) => {
                  updateDisplaySize(size.id, "heightFt", value);
                  onSizeSelectionChange?.((prev) => {
                    const next = { ...(prev || {}) };
                    delete next.rentalHeight;
                    return next;
                  });
                }}
                type="number"
                placeholder="0"
                clearZeroOnFocus
              />
              <TextField
                label={`Quantity (Set)${index > 0 ? ` ${index + 1}` : ""}`}
                value={size.pairs}
                onChange={(value) => updateDisplaySize(size.id, "pairs", value)}
                type="number"
                placeholder="1"
              />
              <label>
                Area (sft)
                <input className="input" value={size.sft || ""} readOnly />
              </label>
            </div>

            {displaySizeRows.length > 1 ? (
              <button className="btn btn-light rental-remove-size" type="button" onClick={() => removeDisplaySize(size.id)}>
                Remove Size
              </button>
            ) : null}
          </div>
        ))}

        <div className="form-row rental-total-sft-row">
          <label>
            Total Area (sft)
            <input className="input pixel-value-input" value={display.sft || ""} readOnly />
          </label>
        </div>
      </section>

      <section>
        <h3>Rental Pricing</h3>
        <div className="form-row">
          <MoneyField label="Display Rate / sft" value={sftRate} onChange={(value) => {
            settingDirty.current.add("sftRate");
            setSftRate(value);
          }} />
          <MoneyField
            label="Structure Rate (Tk)"
            value={structureRate}
            onChange={(value) => {
              settingDirty.current.add("structureRate");
              setStructureRate(value);
            }}
            placeholder="3000"
            restoreEmptyToZero={false}
          />
          <TextField label="Duration" value={duration} onChange={(value) => {
            settingDirty.current.add("duration");
            setDuration(value);
          }} type="number" placeholder="1" />
          <TextField label="Sound System Pair" value={soundPairs} onChange={(value) => {
            settingDirty.current.add("soundPairs");
            setSoundPairs(value);
          }} type="number" placeholder="1" />
          <MoneyField label="Sound System Rate (Tk / Pair)" value={soundRate} onChange={(value) => {
            settingDirty.current.add("soundRate");
            setSoundRate(value);
          }} />
        </div>
      </section>

	      <section>
	        <h3>Transport</h3>
	        <div className="form-row">
	          <MoneyField label="Transport Value (Tk)" value={transportValue} onChange={(value) => {
	            settingDirty.current.add("transportValue");
	            setTransportValue(value);
	          }} />
	        </div>
	      </section>

	      <section>
	        <h3>Included Item Quantity</h3>
	        <div className="form-row">
	          <QuantityField
	            label="Digital Audio Mixer"
	            value={includedQty.mixer}
            onChange={(value) => {
              settingDirty.current.add("includedQty.mixer");
              setIncludedQty((prev) => ({ ...prev, mixer: value }));
            }}
	          />
	          <QuantityField
	            label="Audio Processor"
	            value={includedQty.processor}
            onChange={(value) => {
              settingDirty.current.add("includedQty.processor");
              setIncludedQty((prev) => ({ ...prev, processor: value }));
            }}
	          />
	          <QuantityField
	            label="Wireless Microphone"
	            value={includedQty.wirelessMic}
            onChange={(value) => {
              settingDirty.current.add("includedQty.wirelessMic");
              setIncludedQty((prev) => ({ ...prev, wirelessMic: value }));
            }}
	          />
	          <QuantityField
	            label="Wired Microphone"
	            value={includedQty.wiredMic}
            onChange={(value) => {
              settingDirty.current.add("includedQty.wiredMic");
              setIncludedQty((prev) => ({ ...prev, wiredMic: value }));
            }}
	          />
	          <QuantityField
	            label="Laptop (Display Control)"
	            value={includedQty.laptop}
            onChange={(value) => {
              settingDirty.current.add("includedQty.laptop");
              setIncludedQty((prev) => ({ ...prev, laptop: value }));
            }}
	          />
	          <QuantityField
	            label="Technical Person"
	            value={includedQty.technicalPerson}
            onChange={(value) => {
              settingDirty.current.add("includedQty.technicalPerson");
              setIncludedQty((prev) => ({ ...prev, technicalPerson: value }));
            }}
	          />
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
        <h3>Client's Information</h3>
        <div className="form-row">
          <TextField label="Company Name" value={client.company} onChange={(value) => setClient((prev) => ({ ...prev, company: value }))} />
          <TextField label="Attention" value={client.attention} onChange={(value) => setClient((prev) => ({ ...prev, attention: value }))} />
          <TextField label="Designation" value={client.designation} onChange={(value) => setClient((prev) => ({ ...prev, designation: value }))} />
          <TextField label="Project / Event" value={client.projectEvent} onChange={(value) => setClient((prev) => ({ ...prev, projectEvent: value }))} />
          <TextField label="Venue" value={client.venue} onChange={(value) => setClient((prev) => ({ ...prev, venue: value }))} />
          <TextField label="Event Date" value={client.eventDate} onChange={(value) => setClient((prev) => ({ ...prev, eventDate: value }))} />
          <TextField label="Mobile Number" value={client.mobile} onChange={(value) => setClient((prev) => ({ ...prev, mobile: value }))} />
          <TextField label="Address" value={client.address} onChange={(value) => setClient((prev) => ({ ...prev, address: value }))} />
        </div>
      </section>
    </>
  );
}
