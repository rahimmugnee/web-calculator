export default function MonthFilter({ ariaLabel, value, onChange, disabled = false, children }) {
  return <label className={`dashboard-date-range admin-month-filter${disabled ? " loading" : ""}`}>
    <svg className="dashboard-date-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3v3m10-3v3M4.5 9h15M6 5h12a2 2 0 0 1 2 2v12H4V7a2 2 0 0 1 2-2Z" /></svg>
    <select aria-label={ariaLabel} value={value} onChange={onChange} disabled={disabled}>{children}</select>
    <svg className="dashboard-date-chevron" viewBox="0 0 20 20" aria-hidden="true"><path d="m6 8 4 4 4-4" /></svg>
  </label>;
}
