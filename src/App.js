// src/App.js
import { useCallback, useEffect, useRef, useState } from "react";
import PriceForm from "./components/PriceForm";
import Invoice from "./components/Invoice";
import TermsPage from "./components/TermsPage";
import PDFButton from "./components/PDFButton";
import DisplaySize from "./components/DisplaySize";
import RentalDisplaySize from "./components/RentalDisplaySize";
import { toBDT, generateRef, quotationTitlePdfFilename } from "./lib/calc.js";
import { useCatalog } from "./context/CatalogContext.jsx";
import { quotationHistoryPayload, saveQuotationHistory } from "./lib/quotationHistory.js";

const PREVIEW_PAGE_WIDTH = 794;
const LOGIN_USERNAME = "mugnee";
const LOGIN_PASSWORD = "7679";
const AUTH_SESSION_KEY = "mugneeLoginAuthenticated";
const REMEMBER_LOGIN_KEY = "mugneeRememberedLogin";

function getRememberedLogin() {
  try {
    const raw = window.localStorage.getItem(REMEMBER_LOGIN_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    if (typeof parsed?.username !== "string" || typeof parsed?.password !== "string") return null;
    return { username: parsed.username, password: parsed.password };
  } catch {
    return null;
  }
}

export default function App() {
  const { company, companies, selectedCompanyId, setSelectedCompanyId } = useCatalog();
  const branding = company?.assets || {};
  const selectedCompanyCode = String(company?.code || "mugnee").toLowerCase();
  const invoiceFormatCode = selectedCompanyCode === "mugnee-multiple" ? "mugnee" : selectedCompanyCode;
  const invoiceFormatClass = `invoice-format-${invoiceFormatCode}`;
  const [isAuthenticated, setIsAuthenticated] = useState(
    () => window.sessionStorage.getItem(AUTH_SESSION_KEY) === "true"
  );
  const [loginForm, setLoginForm] = useState(() => getRememberedLogin() || { username: "", password: "" });
  const [rememberPassword, setRememberPassword] = useState(() => Boolean(getRememberedLogin()));
  const [loginMessage, setLoginMessage] = useState("");
  const [snapshot, setSnapshot] = useState(null);
  const [calc, setCalc] = useState(null);
  const [quotationRef, setQuotationRef] = useState(null);
  const [view, setView] = useState("invoice"); // invoice | terms
  const [installationType, setInstallationType] = useState("fixed");
  const [sizePick, setSizePick] = useState(null);
  const [displaySizeActive, setDisplaySizeActive] = useState({});
  const [rentalSizePick, setRentalSizePick] = useState(null);
  const [rentalDisplaySizeActive, setRentalDisplaySizeActive] = useState({});
  const [previewFit, setPreviewFit] = useState({ scale: 1, height: null });

  const invoiceRef = useRef(null);
  const quotationCompanyCodeRef = useRef(null);
  const termsRef = useRef(null);
  const previewStageRef = useRef(null);
  const previewInvoicePageRef = useRef(null);
  const previewTermsPageRef = useRef(null);
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
    if (!calc || !snapshot) {
      setPreviewFit({ scale: 1, height: null });
      return undefined;
    }

    const stage = previewStageRef.current;
    const page = view === "invoice" ? previewInvoicePageRef.current : previewTermsPageRef.current;

    if (!stage || !page) return undefined;

    let frameId = 0;

    const updateFit = () => {
      window.cancelAnimationFrame(frameId);
      frameId = window.requestAnimationFrame(() => {
        const availableWidth = Math.max(0, stage.clientWidth);
        const scale = Math.min(1, availableWidth / PREVIEW_PAGE_WIDTH);
        const nextHeight = Math.ceil(page.scrollHeight * scale);

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
    window.addEventListener("resize", updateFit);

    return () => {
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateFit);
    };
  }, [calc, snapshot, view, isRentalQuotation]);

  function handleLoginChange(event) {
    const { name, value } = event.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  }

  function handleRememberPasswordChange(event) {
    const checked = event.target.checked;
    setRememberPassword(checked);
    if (!checked) window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
  }

  function handleLoginSubmit(event) {
    event.preventDefault();

    const hasValidCredentials =
      loginForm.username.trim() === LOGIN_USERNAME && loginForm.password === LOGIN_PASSWORD;

    if (hasValidCredentials) {
      window.sessionStorage.setItem(AUTH_SESSION_KEY, "true");
      if (rememberPassword) {
        window.localStorage.setItem(REMEMBER_LOGIN_KEY, JSON.stringify(loginForm));
      } else {
        window.localStorage.removeItem(REMEMBER_LOGIN_KEY);
      }
      setLoginMessage("");
      setIsAuthenticated(true);
      return;
    }
    setLoginMessage("Invalid username or password.");
  }

  function handleLogout() {
    const rememberedLogin = getRememberedLogin();
    window.sessionStorage.removeItem(AUTH_SESSION_KEY);
    setLoginForm(rememberedLogin || { username: "", password: "" });
    setRememberPassword(Boolean(rememberedLogin));
    setIsAuthenticated(false);
  }

  // Stable references: PriceForm/RentalPriceForm/PASystemForm depend on
  // these callbacks inside their own effects, so a fresh inline arrow on
  // every App render would re-trigger those effects every render.
  const handleFormChange = useCallback((snap) => setSnapshot(snap), []);
  const handleCalculated = useCallback((result, snap, meta) => {
    setCalc(result);
    setSnapshot(snap);
    setQuotationRef((prev) => {
      if (meta?.userSubmit) return generateRef(company?.code);
      return prev ?? generateRef(company?.code);
    });
  }, [company?.code]);

  useEffect(() => {
    const code = String(company?.code || "mugnee").toLowerCase();
    if (quotationCompanyCodeRef.current === null) {
      quotationCompanyCodeRef.current = code;
      return;
    }
    if (quotationCompanyCodeRef.current !== code) {
      quotationCompanyCodeRef.current = code;
      if (calc && snapshot) setQuotationRef(generateRef(code));
    }
  }, [company?.code, calc, snapshot]);

  if (!isAuthenticated) {
    return (
      <main className="login-page">
        <form className="login-card" onSubmit={handleLoginSubmit}>
          <div className="login-logo-mark">
            <img src={branding.logo || "/Mugnee-Multiple-Limited/logo.png"} alt="Mugnee" className="login-logo" />
          </div>
          <h1>Quotation Builder</h1>
          <p className="login-subtitle">Sign in to continue.</p>

          <label htmlFor="login-username">
            Username
            <input
              id="login-username"
              className="input"
              name="username"
              type="text"
              autoComplete="username"
              value={loginForm.username}
              onChange={handleLoginChange}
            />
          </label>

          <label htmlFor="login-password">
            Password
            <input
              id="login-password"
              className="input"
              name="password"
              type="password"
              autoComplete="current-password"
              value={loginForm.password}
              onChange={handleLoginChange}
            />
          </label>

          <label className="login-remember">
            <input
              type="checkbox"
              checked={rememberPassword}
              onChange={handleRememberPasswordChange}
            />
            <span>Remember password</span>
          </label>

          {loginMessage ? <div className="login-message" role="status">{loginMessage}</div> : null}

          <button className="btn btn-primary login-button" type="submit">
            Login
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
             <button className="top-link top-button" type="button" onClick={handleLogout}>
               Logout
             </button>
          </div>
        </div>

      

      </header>

      <div className="app-shell">
        <div className="container-xxl">
          {/* Left: Form */}
	          <div className="card">
	            <section className="company-picker" aria-labelledby="company-picker-title">
	              <h3 id="company-picker-title">Company Name</h3>
	              <div className="company-picker-options">
	                {companies.map((item) => {
	                  const code = String(item.code || item.name).toLowerCase();
	                  const label = code === "mugnee" ? "Mugnee Multiple Limited" : code === "mugnee-multiple" ? "Mugnee Multiple" : code.includes("renex") ? "Renex" : code.includes("sasha") ? "Sasha" : item.name;
	                  return <label key={item.id} className={String(selectedCompanyId) === String(item.id) ? "company-option active" : "company-option"}>
	                    <input className="radio" type="radio" name="calculator-company" value={item.id} checked={String(selectedCompanyId) === String(item.id)} onChange={() => setSelectedCompanyId(item.id)} />
	                    <span>{label}</span>
	                  </label>;
	                })}
	              </div>
	            </section>

	            <PriceForm
	              sizePick={sizePick}
	              onSizeSelectionChange={setDisplaySizeActive}
	              rentalSizePick={rentalSizePick}
	              onRentalSizeSelectionChange={setRentalDisplaySizeActive}
	              onInstallationTypeChange={setInstallationType}
	              onChange={handleFormChange}
              onCalculated={handleCalculated}
            />

            {calc && (
              <div className="summary">
                <div className="sum-card">
                  <div className="sum-label">Grand Total</div>
                  <div className="sum-value">{toBDT(calc.totals.grandTotal)}</div>
                </div>
              </div>
            )}
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
                  opacity: 1, // keep renderable for html2canvas
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
