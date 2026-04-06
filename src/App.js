// src/App.js
import { useRef, useState } from "react";
import PriceForm from "./components/PriceForm";
import Invoice from "./components/Invoice";
import TermsPage from "./components/TermsPage";
import PDFButton from "./components/PDFButton";
import DisplaySize from "./components/DisplaySize";
import { toBDT, generateRef, quotationPdfFilename } from "./lib/calc.js";

export default function App() {
  const [snapshot, setSnapshot] = useState(null);
  const [calc, setCalc] = useState(null);
  const [quotationRef, setQuotationRef] = useState(null);
  const [view, setView] = useState("invoice"); // invoice | terms

  const invoiceRef = useRef(null);
  const termsRef = useRef(null);

  return (
    <>
      {/* Topbar / Header */}
      <header className="topbar">
        <div className="inner">
          <img src="/logo.png" alt="Renex" className="topbar-logo" />
          <div className="topbar-title">LED Display Builder</div>

          <nav className="topbar-nav">
            <a href="https://mugnee.com/" className="top-link">
              Home
            </a>
          </nav>
      
          <div className="topbar-right">
             <a href="https://www.mugnee.com/product-category/led-display/" className="top-link">LED Display</a>
          </div>
        </div>

      

      </header>

      <div className="app-shell">
        <div className="container-xxl">
          {/* Left: Form */}
          <div className="card">
            <div className="brand-row" style={{ marginBottom: 10 }}>
              <div className="brand-left"></div>
            </div>

            <PriceForm
              onChange={(snap) => setSnapshot(snap)}
              onCalculated={(result, snap, meta) => {
                setCalc(result);
                setSnapshot(snap);
                setQuotationRef((prev) => {
                  if (meta?.userSubmit) return generateRef();
                  return prev ?? generateRef();
                });
              }}
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
                filename={quotationRef ? quotationPdfFilename(quotationRef) : "Mugnee_Quotation.pdf"}
                exportData={snapshot && quotationRef ? { ...snapshot, quotationRef } : snapshot}
              />
            </div>

            {!calc || !snapshot ? (
              <div className="brand-sub">
                Fill the form and click <b>Calculate</b> to preview.
              </div>
            ) : view === "invoice" ? (
              <div id="invoice-root" className="invoice-wrap invoice-dark preview-mode">
                <img src="/Mugnee_Invoice.png" className="invoice-pad-bg pad--contain" alt="" />
                <div className="invoice-inner pad-safe">
                  <div className="invoice-panel">
                    <Invoice ref={invoiceRef} calc={calc} snapshot={snapshot} quotationRef={quotationRef} />
                  </div>
                </div>
              </div>
            ) : (
              <div id="terms-root" className="invoice-wrap invoice-dark preview-mode terms-page">
                <img src="/Mugnee_Invoice.png" className="invoice-pad-bg pad--contain" alt="" />
                {/* ✅ IMPORTANT: terms-inner class added */}
                <div className="invoice-inner pad-safe terms-inner">
                  {/* ✅ IMPORTANT: terms-panel class added */}
                  <div className="invoice-panel terms-panel">
                    <TermsPage ref={termsRef} calc={calc} snapshot={snapshot} />
                  </div>
                </div>
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
                <div id="pdf-page-1" className="invoice-wrap invoice-dark preview-mode">
                  <img src="/Mugnee_Invoice.png" className="invoice-pad-bg pad--contain" alt="" />
                  <div className="invoice-inner pad-safe">
                    <div className="invoice-panel">
                      <Invoice calc={calc} snapshot={snapshot} quotationRef={quotationRef} />
                    </div>
                  </div>
                </div>

                {/* Page-2 (Terms) */}
                <div id="pdf-page-2" className="invoice-wrap invoice-dark preview-mode terms-page">
                  <img src="/Mugnee_Invoice.png" className="invoice-pad-bg pad--contain" alt="" />
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
      <DisplaySize onPick={() => {}} />

      {/* Footer */}
      <footer className="calc-footer">
        <div className="calc-footer-inner">
          <img src="/logo.png" alt="Mugnee" className="calc-footer-logo" />
          <div className="calc-footer-text">Developed by Mugnee IT Solutions</div>
        </div>
      </footer>
    </>
  );
}
