// src/App.js
import { useCallback, useEffect, useRef, useState } from "react";
import PriceForm from "./components/PriceForm";
import Invoice from "./components/Invoice";
import TermsPage from "./components/TermsPage";
import PDFButton from "./components/PDFButton";
import DisplaySize from "./components/DisplaySize";
import RentalDisplaySize from "./components/RentalDisplaySize";
import { generateRef, quotationTitlePdfFilename } from "./lib/calc.js";
import { useCatalog } from "./context/CatalogContext.jsx";
import { quotationHistoryPayload, saveQuotationHistory } from "./lib/quotationHistory.js";

const PREVIEW_PAGE_WIDTH = 794;
const PREVIEW_PAGE_HEIGHT = 1175;
const API_BASE = process.env.REACT_APP_ADMIN_API_URL || "/api";
const LEGACY_AUTH_SESSION_KEY = "mugneeLoginAuthenticated";
const LEGACY_REMEMBER_LOGIN_KEY = "mugneeRememberedLogin";

function cookie(name) {
  return document.cookie.split(";").map((part) => part.trim()).find((part) => part.startsWith(`${name}=`))?.slice(name.length + 1) || "";
}

function quotationConfigurationKey(snapshot) {
  if (!snapshot?.display) return null;
  const model = snapshot.model?.id || snapshot.model?.name || "";
  const sizes = Array.isArray(snapshot.display.sizes)
    ? snapshot.display.sizes.map((size) => [size.widthFt || "", size.heightFt || "", size.pairs || 1])
    : [[snapshot.display.widthFt || "", snapshot.display.heightFt || ""]];
  return JSON.stringify([snapshot.quotationType || "fixed", model, sizes]);
}

function PasswordVisibilityIcon({ hidden = false }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6Z" />
      <circle cx="12" cy="12" r="2.75" />
      {hidden ? <path d="m4 4 16 16" /> : null}
    </svg>
  );
}

function WorkspaceLoadingScreen() {
  return (
    <main className="workspace-loading" role="status" aria-live="polite" aria-label="Loading workspace">
      <div className="workspace-loading-content">
        <div className="workspace-loading-logo" aria-hidden="true">
          <span>C</span>
        </div>
        <h1>Loading your workspace...</h1>
        <p>Please wait a moment while we prepare everything for you.</p>
        <div className="workspace-loading-spinner" aria-hidden="true" />
        <div className="workspace-loading-track" aria-hidden="true">
          <span />
        </div>
      </div>
    </main>
  );
}

export default function App() {
  const { catalog, company, companies, quotationSettings, invoiceSettings, selectedCompanyId, setSelectedCompanyId } = useCatalog();
  const branding = company?.assets || {};
  const selectedCompanyCode = String(company?.code || "mugnee").toLowerCase();
  const configuredInvoiceFormat = String(invoiceSettings?.template_key || "").split("-")[0].toLowerCase();
  const invoiceFormatCode = ["mugnee", "renex", "sasha"].includes(configuredInvoiceFormat)
    ? configuredInvoiceFormat
    : selectedCompanyCode === "mugnee-multiple" ? "mugnee" : selectedCompanyCode;
  const invoiceFormatClass = `invoice-format-${invoiceFormatCode}`;
  const quotationPrefix = quotationSettings?.quotation_prefix || "";
  const [authUser, setAuthUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: "", password: "" });
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [rememberSession, setRememberSession] = useState(false);
  const [loginMessage, setLoginMessage] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(null);
  const [calc, setCalc] = useState(null);
  const [quotationRef, setQuotationRef] = useState(null);
  const [view, setView] = useState("invoice"); // invoice | terms
  const [installationType, setInstallationType] = useState("fixed");
  const [displayType, setDisplayType] = useState("indoor");
  const [technology, setTechnology] = useState("smd");
  const [sizePick, setSizePick] = useState(null);
  const [displaySizeActive, setDisplaySizeActive] = useState({});
  const [rentalSizePick, setRentalSizePick] = useState(null);
  const [rentalDisplaySizeActive, setRentalDisplaySizeActive] = useState({});
  const [previewFit, setPreviewFit] = useState({ scale: 1, height: null });
  const allTechnologyOptions = catalog.technologiesAll?.length ? catalog.technologiesAll : [{ id: "smd", label: "SMD" }];
  const technologyOptions = displayType === "outdoor" ? allTechnologyOptions.filter((item) => item.id === "smd") : allTechnologyOptions;

  const invoiceRef = useRef(null);
  const quotationCompanyCodeRef = useRef(null);
  const quotationConfigurationRef = useRef(null);
  const termsRef = useRef(null);
  const previewStageRef = useRef(null);
  const previewInvoicePageRef = useRef(null);
  const previewTermsPageRef = useRef(null);
  const profileRef = useRef(null);
	  const quotationKind =
	    installationType === "pa" || snapshot?.quotationType === "pa"
	      ? "pa"
	      : installationType === "conference" || snapshot?.quotationType === "conference"
	      ? "conference"
	      : installationType === "rental" || snapshot?.quotationType === "rental" || Array.isArray(calc?.rows)
	      ? "rental"
	      : "fixed";
  const isRentalQuotation = quotationKind === "rental";

  useEffect(() => {
    window.sessionStorage.removeItem(LEGACY_AUTH_SESSION_KEY);
    window.localStorage.removeItem(LEGACY_REMEMBER_LOGIN_KEY);
    let active = true;
    fetch(`${API_BASE}/auth/me`, { credentials: "include", cache: "no-store" })
      .then((response) => response.ok ? response.json() : Promise.reject(new Error("Not authenticated")))
      .then((data) => { if (active) setAuthUser(data.user || null); })
      .catch(() => { if (active) setAuthUser(null); })
      .finally(() => { if (active) setAuthLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!profileOpen) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!profileRef.current?.contains(event.target)) setProfileOpen(false);
    };
    const closeOnEscape = (event) => {
      if (event.key === "Escape") setProfileOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [profileOpen]);

  useEffect(() => {
    if (!calc || !snapshot) {
      setPreviewFit({ scale: 1, height: null });
      return undefined;
    }

    const stage = previewStageRef.current;
    const page = view === "invoice" ? previewInvoicePageRef.current : previewTermsPageRef.current;

    if (!stage || !page) return undefined;

    const inner = page.querySelector(":scope > .invoice-inner");
    const panel = inner?.querySelector(":scope > .invoice-panel");

    let frameId = 0;

    const updateFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        panel?.style.removeProperty("transform");
        panel?.style.removeProperty("transform-origin");
        panel?.style.removeProperty("width");

        if (inner && panel) {
          const innerStyle = window.getComputedStyle(inner);
          const availableHeight = inner.clientHeight
            - (Number.parseFloat(innerStyle.paddingTop) || 0)
            - (Number.parseFloat(innerStyle.paddingBottom) || 0);
          const contentScale = Math.min(1, availableHeight / Math.max(1, panel.scrollHeight));

          if (contentScale < 0.999) {
            panel.style.setProperty("transform", `scale(${contentScale})`, "important");
            panel.style.setProperty("transform-origin", "top left", "important");
            panel.style.setProperty("width", `${100 / contentScale}%`, "important");
          }
        }

        const availableWidth = Math.max(0, stage.clientWidth);
        const scale = Math.min(1, availableWidth / PREVIEW_PAGE_WIDTH);
        const nextHeight = Math.ceil(PREVIEW_PAGE_HEIGHT * scale);

        setPreviewFit((prev) => {
          if (Math.abs(prev.scale - scale) < 0.001 && prev.height === nextHeight) {
            return prev;
          }
          return { scale, height: nextHeight };
        });
      });
    };

    updateFit();

    const resizeObserver = new ResizeObserver(updateFit);
    resizeObserver.observe(stage);
    resizeObserver.observe(page);
    if (panel) resizeObserver.observe(panel);
    window.addEventListener("resize", updateFit);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFit);
      panel?.style.removeProperty("transform");
      panel?.style.removeProperty("transform-origin");
      panel?.style.removeProperty("width");
    };
  }, [calc, snapshot, view, isRentalQuotation]);

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleLoginSubmit(event) {
    event.preventDefault();
    setLoginLoading(true);
    setLoginMessage("");
    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: loginForm.email.trim(), password: loginForm.password, remember: rememberSession }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Login failed.");
      setAuthUser(data.user || null);
      setLoginForm((current) => ({ ...current, password: "" }));
      setShowLoginPassword(false);
      setLoginMessage("");
    } catch (error) {
      setLoginMessage(error.message || "Invalid email or password.");
    } finally {
      setLoginLoading(false);
    }
  }

  async function handleLogout() {
    setProfileOpen(false);
    try {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        credentials: "include",
        headers: { "X-CSRF-Token": decodeURIComponent(cookie("calculator_admin_csrf")) },
      });
    } finally {
      setAuthUser(null);
      setLoginForm({ email: "", password: "" });
      setShowLoginPassword(false);
      setRememberSession(false);
    }
  }

  // Stable references: PriceForm/RentalPriceForm/PASystemForm depend on
  // these callbacks inside their own effects, so a fresh inline arrow on
  // every App render would re-trigger those effects every render.
  const handleFormChange = useCallback((snap) => setSnapshot(snap), []);
  const handleCalculated = useCallback((result, snap, meta) => {
    setCalc(result);
    setSnapshot(snap);
    const nextConfiguration = quotationConfigurationKey(snap);
    const configurationChanged = nextConfiguration !== null
      && quotationConfigurationRef.current !== null
      && quotationConfigurationRef.current !== nextConfiguration;
    if (nextConfiguration !== null) quotationConfigurationRef.current = nextConfiguration;
    setQuotationRef((prev) => {
      if (meta?.userSubmit || configurationChanged) return generateRef(company?.code, undefined, new Date(), quotationPrefix);
      return prev ?? generateRef(company?.code, undefined, new Date(), quotationPrefix);
    });
  }, [company?.code, quotationPrefix]);

  useEffect(() => {
    const code = String(company?.code || "mugnee").toLowerCase();
    const identity = `${code}|${quotationPrefix}`;
    if (quotationCompanyCodeRef.current === null) {
      quotationCompanyCodeRef.current = identity;
      return;
    }
    if (quotationCompanyCodeRef.current !== identity) {
      quotationCompanyCodeRef.current = identity;
      if (calc && snapshot) setQuotationRef(generateRef(code, undefined, new Date(), quotationPrefix));
    }
  }, [company?.code, quotationPrefix, calc, snapshot]);

  if (authLoading) {
    return <WorkspaceLoadingScreen />;
  }

  if (!authUser) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleLoginSubmit}>
          <div className="login-logo-mark">
            <img src={branding.logo || "/Mugnee-Multiple-Limited/logo.png"} alt="Mugnee" className="login-logo" />
          </div>
          <h1>Quotation Builder</h1>
          <p className="login-subtitle">Sign in to continue.</p>

          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              className="input"
              name="email"
              type="email"
              autoComplete="username"
              value={loginForm.email}
              onChange={handleLoginChange}
              required
            />
          </label>

          <label htmlFor="login-password">
            Password
            <span className="login-password-field">
              <input
                id="login-password"
                className="input"
                name="password"
                type={showLoginPassword ? "text" : "password"}
                autoComplete="current-password"
                value={loginForm.password}
                onChange={handleLoginChange}
                required
              />
              <button
                type="button"
                className="login-password-toggle"
                onClick={() => setShowLoginPassword((visible) => !visible)}
                aria-label={showLoginPassword ? "Hide password" : "Show password"}
                aria-pressed={showLoginPassword}
                title={showLoginPassword ? "Hide password" : "Show password"}
              >
                <PasswordVisibilityIcon hidden={showLoginPassword} />
              </button>
            </span>
          </label>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(event) => setRememberSession(event.target.checked)}
            />
            <span>Keep me signed in</span>
          </label>

          {loginMessage ? <div className="login-message" role="status">{loginMessage}</div> : null}

          <button className="btn btn-primary login-button" type="submit" disabled={loginLoading}>
            {loginLoading ? "Signing in..." : "Login"}
          </button>
        </form>
      </main>
    );
  }

  return (
    <>
      {/* Topbar / Header */}
      <header className="topbar">
        <div className="inner">
          <img src={branding.logo || "/Mugnee-Multiple-Limited/logo.png"} alt="Company" className="topbar-logo" />
          <div className="topbar-title">LED Display Builder</div>

          <nav className="topbar-nav">
            <a href="/admin/login" className="top-link" target="_blank" rel="noopener noreferrer">
              Admin Panel
            </a>
            <a href="https://mugnee.com/" className="top-link">
              Home
            </a>
          </nav>
      
          <div className="topbar-right">
             <a href="https://www.mugnee.com/product-category/led-display/" className="top-link">LED Display</a>
             <div className="calculator-profile" ref={profileRef}>
               <button
                 className="calculator-profile-button"
                 type="button"
                 aria-expanded={profileOpen}
                 aria-haspopup="menu"
                 onClick={() => setProfileOpen((current) => !current)}
               >
                 <span className="calculator-profile-avatar" aria-hidden="true">{authUser.display_name?.[0] || authUser.email?.[0] || "U"}</span>
                 <span className="calculator-profile-name"><b>{authUser.display_name || authUser.email}</b><small>{authUser.role_name || authUser.role}</small></span>
                 <span className="calculator-profile-arrow" aria-hidden="true">⌄</span>
               </button>
               {profileOpen ? <div className="calculator-profile-menu" role="menu">
                 <div className="calculator-profile-identity"><b>{authUser.email}</b><small>{authUser.role_name || authUser.role}</small></div>
                 <button type="button" role="menuitem" onClick={handleLogout}>Logout</button>
               </div> : null}
             </div>
          </div>
        </div>

      

      </header>

      <div className="app-shell">
        <div className="container-xxl">
          {/* Left: Form */}
	          <div className="card">
	            <section className="calculator-context-row" aria-label="Calculator setup">
	              <label className="calculator-context-field">
	                <span>Company Name</span>
	                <select aria-label="Company Name" value={selectedCompanyId} onChange={(event) => setSelectedCompanyId(event.target.value)}>
	                  {companies.map((item) => {
	                    const code = String(item.code || item.name).toLowerCase();
	                    const label = code === "mugnee" ? "Mugnee Multiple Limited" : code === "mugnee-multiple" ? "Mugnee Multiple" : code.includes("renex") ? "Renex" : code.includes("sasha") ? "Sasha" : item.name;
	                    return <option key={item.id} value={item.id}>{label}</option>;
	                  })}
	                </select>
	              </label>
	              <label className="calculator-context-field">
	                <span>Calculator Category</span>
	                <select aria-label="Calculator Category" value={installationType} onChange={(event) => setInstallationType(event.target.value)}>
	                  <option value="fixed">LED Display</option>
	                  <option value="rental">Rental</option>
	                  <option value="pa">PA System</option>
	                  <option value="conference">Conference System</option>
	                </select>
	              </label>
	              <label className="calculator-context-field">
	                <span>Display Type</span>
	                <select aria-label="Display Type" value={displayType} disabled={installationType !== "fixed"} onChange={(event) => {
	                  const nextDisplayType = event.target.value;
	                  setDisplayType(nextDisplayType);
	                  if (nextDisplayType === "outdoor") setTechnology("smd");
	                }}>
	                  <option value="indoor">Indoor</option>
	                  <option value="outdoor">Outdoor</option>
	                </select>
	              </label>
	              <label className="calculator-context-field">
	                <span>Technology</span>
	                <select aria-label="Technology" value={technology} disabled={installationType !== "fixed"} onChange={(event) => setTechnology(event.target.value)}>
	                  {technologyOptions.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
	                </select>
	              </label>
	            </section>

	            <PriceForm
	              installationType={installationType}
	              displayType={displayType}
	              technology={technology}
	              sizePick={sizePick}
	              onSizeSelectionChange={setDisplaySizeActive}
	              rentalSizePick={rentalSizePick}
	              onRentalSizeSelectionChange={setRentalDisplaySizeActive}
	              onChange={handleFormChange}
              onCalculated={handleCalculated}
            />

          </div>

          {/* Right: Preview + Download */}
          <div className="card">
            <div className="inline" style={{ justifyContent: "space-between", marginBottom: 8 }}>
              <div className="inline" style={{ gap: 8 }}>
                <h3 style={{ marginRight: 10 }}>Preview</h3>

                <button
                  className={`btn ${view === "invoice" ? "btn-primary" : "btn-light"}`}
                  onClick={() => setView("invoice")}
                  type="button"
                >
                  Invoice
                </button>

                <button
                  className={`btn ${view === "terms" ? "btn-primary" : "btn-light"}`}
                  onClick={() => setView("terms")}
                  type="button"
                >
                  Terms
                </button>
              </div>

              {/* ✅ One click download => 2 pages */}
              <PDFButton
                targetIds={["pdf-page-1", "pdf-page-2"]}
                filename={snapshot ? quotationTitlePdfFilename(snapshot, quotationRef) : "Mugnee_Quotation.pdf"}
                exportData={snapshot && quotationRef ? { ...snapshot, quotationRef } : snapshot}
                onBeforeDownload={calc && snapshot && quotationRef ? () => saveQuotationHistory(quotationHistoryPayload({ company, quotationRef, snapshot, calc })) : null}
              />
            </div>

            {!calc || !snapshot ? (
              <div className="brand-sub">
                Fill the form and click <b>Calculate</b> to preview.
              </div>
            ) : (
              <div
                className="preview-stage"
                ref={previewStageRef}
                style={{
                  "--preview-scale": previewFit.scale,
                  "--preview-height": previewFit.height ? `${previewFit.height}px` : undefined,
                }}
              >
                {view === "invoice" ? (
	                  <div ref={previewInvoicePageRef} id="invoice-root" className={`invoice-wrap invoice-dark preview-mode ${invoiceFormatClass}`}>
                <img src={branding.invoice_pad || "/Mugnee-Multiple-Limited/Mugnee_Invoice.png"} className="invoice-pad-bg pad--contain" alt="" />
                <div className="invoice-inner pad-safe">
                  <div className="invoice-panel">
                    <Invoice ref={invoiceRef} calc={calc} snapshot={snapshot} quotationRef={quotationRef} />
                  </div>
                </div>
                  </div>
                ) : (
                  <div ref={previewTermsPageRef} id="terms-root" className="invoice-wrap invoice-dark preview-mode terms-page">
                <img src={branding.invoice_pad || "/Mugnee-Multiple-Limited/Mugnee_Invoice.png"} className="invoice-pad-bg pad--contain" alt="" />
                {/* ✅ IMPORTANT: terms-inner class added */}
                <div className="invoice-inner pad-safe terms-inner">
                  {/* ✅ IMPORTANT: terms-panel class added */}
                  <div className="invoice-panel terms-panel">
                    <TermsPage ref={termsRef} calc={calc} snapshot={snapshot} />
                  </div>
                </div>
                  </div>
                )}
              </div>
            )}

            {/* ✅ Hidden printable pages (always rendered, not display:none) */}
            {calc && snapshot ? (
              <div
                style={{
                  position: "absolute",
                  left: "-10000px",
                  top: 0,
                  width: "794px", // ✅ IMPORTANT: match A4 width (same as invoice-wrap)
                  pointerEvents: "none",
                  opacity: 1, // keep the hidden native-PDF source measurable
                }}
              >
                {/* Page-1 (Invoice) */}
	                <div id="pdf-page-1" className={`invoice-wrap invoice-dark preview-mode ${invoiceFormatClass}`}>
                  <img src={branding.invoice_pad || "/Mugnee-Multiple-Limited/Mugnee_Invoice.png"} className="invoice-pad-bg pad--contain" alt="" />
                  <div className="invoice-inner pad-safe">
                    <div className="invoice-panel">
                      <Invoice calc={calc} snapshot={snapshot} quotationRef={quotationRef} />
                    </div>
                  </div>
                </div>

                {/* Page-2 (Terms) */}
                <div id="pdf-page-2" className="invoice-wrap invoice-dark preview-mode terms-page">
                  <img src={branding.invoice_pad || "/Mugnee-Multiple-Limited/Mugnee_Invoice.png"} className="invoice-pad-bg pad--contain" alt="" />
                  {/* ✅ IMPORTANT: terms-inner class added */}
                  <div className="invoice-inner pad-safe terms-inner">
                    {/* ✅ IMPORTANT: terms-panel class added */}
                    <div className="invoice-panel terms-panel">
                      <TermsPage calc={calc} snapshot={snapshot} />
                    </div>
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      {/* ✅ Display Size section (Footer এর উপরে) */}
		      {quotationKind === "pa" || quotationKind === "conference" ? null : quotationKind === "rental" ? (
		        <RentalDisplaySize
		          activeChips={rentalDisplaySizeActive}
		          onPick={(row, val, nextActiveChips) => {
		            setRentalDisplaySizeActive(nextActiveChips || {});
		            setRentalSizePick(null);
		          }}
		        />
	      ) : (
	        <DisplaySize
	          activeChips={displaySizeActive}
	          onPick={(row, val) => {
	            if (row.toLowerCase().includes("height")) {
	              setSizePick({ row, height: val });
	            } else {
	              setSizePick({ row, width: val });
	            }
	          }}
	        />
	      )}

      {/* Footer */}
      <footer className="calc-footer">
        <div className="calc-footer-inner">
          <img src={branding.logo || "/Mugnee-Multiple-Limited/logo.png"} alt="Company" className="calc-footer-logo" />
          <div className="calc-footer-text">Developed by Mugnee IT Solutions</div>
        </div>
      </footer>
    </>
  );
}
