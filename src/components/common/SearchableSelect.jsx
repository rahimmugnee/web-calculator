import { useEffect, useMemo, useRef, useState } from "react";

// A type-to-filter dropdown, visually matching the app's existing
// .custom-select* classes (see PriceForm.jsx's private CustomSelect), with
// a search input added at the top of the menu.
export default function SearchableSelect({ value, options, onChange, placeholder = "Select...", ariaLabel, openSignal }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef(null);
  const searchRef = useRef(null);

  // Incrementing openSignal (e.g. from a "Replace" button elsewhere in the
  // card) forces the menu open, letting callers open it imperatively.
  useEffect(() => {
    if (openSignal) setOpen(true);
  }, [openSignal]);

  const selected = options.find((option) => option.value === value) || null;
  const disabled = !options.length;

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter((option) => option.label.toLowerCase().includes(q));
  }, [options, query]);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!wrapRef.current?.contains(event.target)) setOpen(false);
    };

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery("");
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  return (
    <div className={`custom-select pa-searchable-select${open ? " open" : ""}${disabled ? " disabled" : ""}`} ref={wrapRef}>
      <button
        type="button"
        className="custom-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => setOpen((next) => !next)}
      >
        <span className={selected ? "" : "custom-select-placeholder"}>{selected?.label || placeholder}</span>
      </button>

      {open ? (
        <div className="custom-select-menu pa-searchable-menu" role="listbox" aria-label={ariaLabel}>
          <input
            ref={searchRef}
            className="input pa-searchable-input"
            type="text"
            value={query}
            placeholder="Type to search..."
            onChange={(event) => setQuery(event.target.value)}
            onClick={(event) => event.stopPropagation()}
          />
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
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
            ))
          ) : (
            <div className="pa-searchable-empty">No matches</div>
          )}
        </div>
      ) : null}
    </div>
  );
}
