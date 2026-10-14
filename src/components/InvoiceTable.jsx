import { useCallback, useLayoutEffect, useRef } from "react";
import { toBDT } from "../lib/calc.js";

function AutoFitText({ children, className = "" }) {
  const containerRef = useRef(null);
  const textRef = useRef(null);

  const fitText = useCallback(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    text.style.removeProperty("font-size");
    const availableWidth = container.clientWidth;
    const naturalWidth = text.scrollWidth;
    if (!availableWidth || !naturalWidth || naturalWidth <= availableWidth) return;

    const baseFontSize = Number.parseFloat(window.getComputedStyle(text).fontSize) || 12;
    text.style.fontSize = `${Math.max(1, baseFontSize * (availableWidth / naturalWidth) * 0.98)}px`;
  }, []);

  useLayoutEffect(() => {
    let cancelled = false;
    const fit = () => {
      if (!cancelled) fitText();
    };
    fit();
    document.fonts?.ready?.then(fit);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    if (containerRef.current) observer?.observe(containerRef.current);
    return () => {
      cancelled = true;
      observer?.disconnect();
    };
  }, [children, fitText]);

  return (
    <span ref={containerRef} className={`table-cell-fit ${className}`.trim()}>
      <span ref={textRef} className="table-cell-fit-text">{children}</span>
    </span>
  );
}

export default function InvoiceTable({ rows, totals, showDiscountBlock }) {
  return (
        <table className="table invoice-table mugnee-invoice-table">
          <colgroup>
            <col className="col-sl" />
            <col className="col-item" />
            <col className="col-brand" />
            <col className="col-model" />
            <col className="col-unit" />
            <col className="col-qty" />
            <col className="col-unit-price" />
            <col className="col-total-price" />
          </colgroup>
          <thead>
            <tr>
              <th><AutoFitText>SL.</AutoFitText></th>
              <th><AutoFitText>Item Name</AutoFitText></th>
              <th><AutoFitText>Brand</AutoFitText></th>
              <th><AutoFitText>Model</AutoFitText></th>
              <th><AutoFitText>Unit</AutoFitText></th>
              <th><AutoFitText>Qty</AutoFitText></th>
              <th><AutoFitText>Unit Price ৳</AutoFitText></th>
              <th><AutoFitText>Total Price ৳</AutoFitText></th>
            </tr>
          </thead>

          <tbody>
            {rows.map((r) => (
              <tr key={r.sl} className={r.className || ""}>
                <td><AutoFitText>{r.sl}</AutoFitText></td>
                <td>
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-${index}`} className="package-line">
                          <AutoFitText className="item-name">{line.name}</AutoFitText>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <AutoFitText className="item-name">{r.name}</AutoFitText>
                  )}
                </td>
                <td>
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-brand-${index}`} className="package-line">
                          <AutoFitText>{line.brand || "—"}</AutoFitText>
                        </div>
                      ))}
                    </div>
                  ) : <AutoFitText>{r.brand || "—"}</AutoFitText>}
                </td>
                <td>
                  {r.type === "package" ? (
                    <div className="package-lines">
                      {r.packageLines.map((line, index) => (
                        <div key={`${r.sl}-model-${index}`} className="package-line">
                          <AutoFitText>{line.model || "—"}</AutoFitText>
                        </div>
                      ))}
                    </div>
                  ) : <AutoFitText>{r.model || "—"}</AutoFitText>}
                </td>
                <td><AutoFitText>{r.unit}</AutoFitText></td>
                <td><AutoFitText>{r.qty}</AutoFitText></td>
                <td><AutoFitText>{toBDT(r.unitPrice)}</AutoFitText></td>
                <td><AutoFitText>{toBDT(r.total)}</AutoFitText></td>
              </tr>
            ))}

            {/* ✅ VAT ON হলে: Total + VAT + Grand Total দেখাবে */}
            {totals?.vatEnabled ? (
              <>
                <tr className="row-accent">
                  <td colSpan={7} className="total-big total-label"><AutoFitText>Subtotal =</AutoFitText></td>
                  <td className="total-big"><AutoFitText>{toBDT(totals.totalBeforeVat)}</AutoFitText></td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="total-big total-label"><AutoFitText>Vat ({Math.round((totals.vatRate || 0.1) * 100)}%) =</AutoFitText></td>
                  <td className="total-big"><AutoFitText>{toBDT(totals.vatAmount)}</AutoFitText></td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="total-big total-label"><AutoFitText>Grand Total =</AutoFitText></td>
                  <td className="total-big"><AutoFitText>{toBDT(totals.grandTotal)}</AutoFitText></td>
                </tr>
              </>
            ) : (
              <tr className="row-accent">
                <td colSpan={7} className="total-big total-label"><AutoFitText>Grand Total =</AutoFitText></td>
                <td className="total-big"><AutoFitText>{toBDT(totals.grandTotal)}</AutoFitText></td>
              </tr>
            )}

            {/* ✅ Discount block (ONLY when enabled) */}
            {showDiscountBlock ? (
              <>
                <tr className="row-accent">
                  <td colSpan={7} className="total-big total-label"><AutoFitText>Special Discount =</AutoFitText></td>
                  <td className="total-big"><AutoFitText>{toBDT(totals.discount || 0)}</AutoFitText></td>
                </tr>

                <tr className="row-accent">
                  <td colSpan={7} className="total-big total-label"><AutoFitText>Payable =</AutoFitText></td>
                  <td className="total-big"><AutoFitText>{toBDT(totals.payable ?? totals.grandTotal)}</AutoFitText></td>
                </tr>
              </>
            ) : null}
          </tbody>
        </table>
  );
}
